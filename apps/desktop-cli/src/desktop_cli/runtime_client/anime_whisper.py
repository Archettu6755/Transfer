"""Real anime-whisper WebSocket client for Docker-based ASR runtime."""

from __future__ import annotations

import asyncio
import json
import struct
import wave
from dataclasses import dataclass, field
from pathlib import Path

import websockets
from websockets.asyncio.client import ClientConnection

from desktop_cli.audio_input import AudioChunk

from .client import (
    CancelStreamRequest,
    FinalTranscriptEvent,
    FinishStreamRequest,
    LocalAsrSegment,
    RuntimeClientConfig,
    RuntimeEvent,
    StartStreamRequest,
    StreamCompletedEvent,
    StreamFailedEvent,
    StreamStartedEvent,
    TranscribeFileRequest,
    TranscribeFileResponse,
)


@dataclass(slots=True)
class AnimeWhisperRuntimeClient:
    """Real runtime client that connects to a Docker anime-whisper ASR server."""

    _ws: ClientConnection | None = field(default=None, init=False)
    _base_url: str = field(default="", init=False)
    _timeout_ms: int = field(default=30_000, init=False)

    async def init(self, config: RuntimeClientConfig) -> None:
        self._base_url = config.base_url.rstrip("/")
        self._timeout_ms = config.timeout_ms

    async def transcribe_file(
        self, request: TranscribeFileRequest
    ) -> TranscribeFileResponse:
        self._ensure_init()
        file_name = request.file_name
        if not file_name:
            raise RuntimeError("transcribe_file requires a file_name.")
        path = Path(file_name)
        if not path.is_file():
            raise RuntimeError(f"Audio file not found: {file_name}")

        with wave.open(str(path), "rb") as wf:
            sample_rate = wf.getframerate()
            pcm_data = wf.readframes(wf.getnframes())

        ws_url = self._base_url
        try:
            ws = await websockets.connect(ws_url)
        except Exception as exc:
            raise RuntimeError(
                f"Could not connect to the anime-whisper ASR server at {ws_url}. "
                "Make sure the Docker container is running: docker compose up -d"
            ) from exc

        try:
            await ws.send(json.dumps({
                "type": "start-stream",
                "stream_id": request.request_id,
                "source_lang": request.source_lang,
                "sample_rate": sample_rate,
            }))
            events = await self._drain_ws(ws)
            self._raise_if_failed(events)
            started = any(
                e for e in events if e["type"] == "stream-started"
            )
            if not started:
                raise RuntimeError("anime-whisper ASR server did not acknowledge stream startup.")

            chunk_size = int(sample_rate * 0.1) * 2
            for offset in range(0, len(pcm_data), chunk_size):
                chunk = pcm_data[offset : offset + chunk_size]
                await ws.send(chunk)
                for event in await self._drain_ws(ws):
                    if event["type"] == "stream-failed":
                        await ws.close()
                        raise RuntimeError(
                            str(event.get("message") or "anime-whisper ASR stream failed.")
                        )
                    if event["type"] == "final-transcript":
                        seg = event.get("segment", {})
                        text = seg.get("text", "")
                        await ws.send(json.dumps({
                            "type": "finish-stream",
                            "stream_id": request.request_id,
                        }))
                        await ws.close()
                        return TranscribeFileResponse(
                            request_id=request.request_id,
                            text=text,
                            lang=request.source_lang,
                        )
            await ws.send(json.dumps({
                "type": "finish-stream",
                "stream_id": request.request_id,
            }))
            text = ""
            events = await self._drain_ws(ws, flush=True)
            self._raise_if_failed(events)
            for event in events:
                if event["type"] == "final-transcript":
                    seg = event.get("segment", {})
                    text = seg.get("text", "")
            await ws.close()
            return TranscribeFileResponse(
                request_id=request.request_id,
                text=text,
                lang=request.source_lang,
            )
        except Exception:
            try:
                await ws.close()
            except Exception:
                pass
            raise

    async def start_stream(self, request: StartStreamRequest) -> list[RuntimeEvent]:
        self._ensure_init()
        ws_url = self._base_url
        try:
            self._ws = await websockets.connect(ws_url)
        except Exception as exc:
            raise RuntimeError(
                f"Could not connect to the anime-whisper ASR server at {ws_url}. "
                "Make sure the Docker container is running: docker compose up -d"
            ) from exc
        await self._ws.send(json.dumps({
            "type": "start-stream",
            "stream_id": request.stream_id,
            "source_lang": request.source_lang,
            "sample_rate": request.sample_rate,
        }))
        return await self._drain_events()

    async def push_chunk(self, chunk: AudioChunk) -> list[RuntimeEvent]:
        self._ensure_ws()
        try:
            await self._ws.send(chunk.pcm_bytes)
        except websockets.exceptions.ConnectionClosed:
            return [StreamFailedEvent(
                stream_id="",
                message="ASR server connection closed unexpectedly.",
            )]
        return await self._drain_events()

    async def finish_stream(self, request: FinishStreamRequest) -> list[RuntimeEvent]:
        self._ensure_ws()
        try:
            await self._ws.send(json.dumps({
                "type": "finish-stream",
                "stream_id": request.stream_id,
            }))
        except websockets.exceptions.ConnectionClosed:
            return [StreamCompletedEvent(stream_id=request.stream_id)]
        events = await self._drain_events(flush=True)
        await self._close_ws()
        return events

    async def cancel_stream(self, request: CancelStreamRequest) -> list[RuntimeEvent]:
        ws = self._ws
        if ws is not None:
            try:
                await ws.send(json.dumps({
                    "type": "cancel-stream",
                    "stream_id": request.stream_id,
                    "reason": request.reason,
                }))
            except Exception:
                pass
        await self._close_ws()
        return []

    async def dispose(self) -> None:
        await self._close_ws()

    async def _drain_events(
        self, *, flush: bool = False
    ) -> list[RuntimeEvent]:
        raw_events = await self._drain_ws(self._ws, flush=flush)
        events: list[RuntimeEvent] = []
        for raw in raw_events:
            event = self._parse_event(raw)
            if event is not None:
                events.append(event)
        return events

    @staticmethod
    async def _drain_ws(
        ws: ClientConnection, *, flush: bool = False
    ) -> list[dict[str, object]]:
        raw_events: list[dict[str, object]] = []
        poll_timeout = 0.05 if not flush else 0.5

        while True:
            try:
                msg = await asyncio.wait_for(ws.recv(), timeout=poll_timeout)
            except asyncio.TimeoutError:
                break
            except websockets.exceptions.ConnectionClosed:
                break

            if isinstance(msg, str):
                try:
                    data = json.loads(msg)
                except json.JSONDecodeError:
                    continue
                raw_events.append(data)
                if data.get("type") in ("stream-completed", "stream-failed"):
                    break

        return raw_events

    def _parse_event(self, raw: str | dict[str, object]) -> RuntimeEvent | None:
        if isinstance(raw, str):
            try:
                data = json.loads(raw)
            except json.JSONDecodeError:
                return None
        else:
            data = raw

        event_type = data.get("type")
        stream_id = data.get("stream_id", "")

        if event_type == "stream-started":
            return StreamStartedEvent(stream_id=stream_id)
        if event_type == "final-transcript":
            seg = data.get("segment", {})
            return FinalTranscriptEvent(
                stream_id=stream_id,
                segment=LocalAsrSegment(
                    id=seg.get("id", ""),
                    text=seg.get("text", ""),
                    is_final=seg.get("is_final", True),
                    start_ms=seg.get("start_ms"),
                    end_ms=seg.get("end_ms"),
                ),
            )
        if event_type == "stream-completed":
            return StreamCompletedEvent(stream_id=stream_id)
        if event_type == "stream-failed":
            return StreamFailedEvent(
                stream_id=stream_id,
                message=data.get("message", ""),
                retryable=data.get("retryable", False),
            )
        return None

    @staticmethod
    def _raise_if_failed(events: list[dict[str, object]]) -> None:
        for event in events:
            if event.get("type") == "stream-failed":
                message = str(event.get("message") or "anime-whisper ASR stream failed.")
                raise RuntimeError(message)

    async def _close_ws(self) -> None:
        ws = self._ws
        self._ws = None
        if ws is not None:
            try:
                await ws.close()
            except Exception:
                pass

    def _ensure_init(self) -> None:
        if not self._base_url:
            raise RuntimeError(
                "AnimeWhisperRuntimeClient has not been initialized. Call init() first."
            )

    def _ensure_ws(self) -> None:
        if self._ws is None:
            raise RuntimeError("No active WebSocket connection. Call start_stream() first.")
