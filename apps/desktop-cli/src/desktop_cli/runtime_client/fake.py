"""Fake runtime client for local Phase 6 validation."""

from __future__ import annotations

from dataclasses import dataclass, field

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
    StreamStartedEvent,
    TranscribeFileRequest,
    TranscribeFileResponse,
)


@dataclass(slots=True)
class FakeRuntimeClient:
    """Emit a stable final Japanese transcript without a real runtime."""

    final_text: str = "これはフェイク runtime の最終文字起こしです。"
    final_after_chunks: int = 2
    _config: RuntimeClientConfig | None = field(default=None, init=False)
    _stream_id: str = field(default="", init=False)
    _started: bool = field(default=False, init=False)
    _disposed: bool = field(default=False, init=False)
    _chunk_count: int = field(default=0, init=False)
    _final_emitted: bool = field(default=False, init=False)

    async def init(self, config: RuntimeClientConfig) -> None:
        self._config = config
        self._disposed = False

    async def transcribe_file(
        self, request: TranscribeFileRequest
    ) -> TranscribeFileResponse:
        return TranscribeFileResponse(
            request_id=request.request_id,
            text=self.final_text,
            lang="ja",
            latency_ms=0,
        )

    async def start_stream(self, request: StartStreamRequest) -> list[RuntimeEvent]:
        self._ensure_ready()
        self._stream_id = request.stream_id
        self._started = True
        self._chunk_count = 0
        self._final_emitted = False
        return [StreamStartedEvent(stream_id=request.stream_id)]

    async def push_chunk(self, chunk: AudioChunk) -> list[RuntimeEvent]:
        self._ensure_started()
        self._chunk_count += 1
        if self._final_emitted or self._chunk_count < self.final_after_chunks:
            return []
        self._final_emitted = True
        return [self._build_final_event()]

    async def finish_stream(self, request: FinishStreamRequest) -> list[RuntimeEvent]:
        self._ensure_started()
        events: list[RuntimeEvent] = []
        if not self._final_emitted:
            self._final_emitted = True
            events.append(self._build_final_event())
        events.append(StreamCompletedEvent(stream_id=request.stream_id))
        self._started = False
        return events

    async def cancel_stream(self, request: CancelStreamRequest) -> list[RuntimeEvent]:
        self._started = False
        return [StreamCompletedEvent(stream_id=request.stream_id)]

    async def dispose(self) -> None:
        self._disposed = True
        self._started = False

    def _build_final_event(self) -> FinalTranscriptEvent:
        return FinalTranscriptEvent(
            stream_id=self._stream_id,
            segment=LocalAsrSegment(
                id=f"{self._stream_id}:final",
                text=self.final_text,
                is_final=True,
            ),
        )

    def _ensure_ready(self) -> None:
        if self._disposed:
            raise RuntimeError("Fake runtime client has already been disposed.")
        if self._config is None:
            raise RuntimeError("Fake runtime client has not been initialized.")

    def _ensure_started(self) -> None:
        self._ensure_ready()
        if not self._started:
            raise RuntimeError("Fake runtime stream has not been started.")
