"""WebSocket ASR server: anime-whisper + faster-whisper with built-in Silero VAD."""

import asyncio
import json
import logging
import struct
from typing import Any

import numpy as np
from faster_whisper import WhisperModel
from websockets.asyncio.server import ServerConnection, serve

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
)
logger = logging.getLogger("asr-server")

MODEL_PATH = "/app/model"
MODEL_DEVICE = "cuda"
MODEL_COMPUTE_TYPE = "float16"
SAMPLE_RATE = 16_000
PORT = 9000

_segment_counter = 0


def next_segment_id() -> str:
    global _segment_counter
    _segment_counter += 1
    return f"seg-{_segment_counter}"


def pcm16_to_float32(pcm_bytes: bytes) -> np.ndarray:
    samples = struct.unpack(f"<{len(pcm_bytes) // 2}h", pcm_bytes)
    return np.array(samples, dtype=np.float32) / 32768.0


class StreamSession:
    """Accumulate audio chunks; transcription on finish using built-in VAD."""

    def __init__(self, stream_id: str, transcriber: "Transcriber") -> None:
        self.stream_id = stream_id
        self.transcriber = transcriber
        self.frames: list[np.ndarray] = []
        self.finished = False

    def push_audio(self, pcm_bytes: bytes) -> None:
        self.frames.append(pcm16_to_float32(pcm_bytes))

    def flush(self) -> list[dict[str, Any]]:
        if not self.frames:
            return []

        audio = np.concatenate(self.frames)
        self.frames = []

        segments = self.transcriber.transcribe(audio)
        events: list[dict[str, Any]] = []
        for seg in segments:
            events.append({
                "type": "final-transcript",
                "stream_id": self.stream_id,
                "segment": {
                    "id": next_segment_id(),
                    "text": seg.text.strip(),
                    "is_final": True,
                    "start_ms": int(seg.start * 1000) if seg.start is not None else 0,
                    "end_ms": int(seg.end * 1000) if seg.end is not None else 0,
                },
            })
        return events

    def check_segment_ready(self) -> list[dict[str, Any]]:
        return []


class Transcriber:
    def __init__(self) -> None:
        logger.info("Loading anime-whisper model from %s...", MODEL_PATH)
        self.model = WhisperModel(
            MODEL_PATH,
            device=MODEL_DEVICE,
            compute_type=MODEL_COMPUTE_TYPE,
        )

    def transcribe(self, audio: np.ndarray) -> list:
        return self._transcribe_chunked(audio)

    def _transcribe_one(self, audio: np.ndarray) -> list:
        segments, _info = self.model.transcribe(
            audio,
            language="ja",
            beam_size=5,
            vad_filter=True,
            vad_parameters={
                "threshold": 0.5,
                "min_speech_duration_ms": 250,
                "min_silence_duration_ms": 1000,
                "speech_pad_ms": 400,
            },
        )
        return [seg for seg in segments if seg.text]

    def _transcribe_chunked(self, audio: np.ndarray) -> list:
        duration_s = len(audio) / SAMPLE_RATE
        if duration_s <= 25.0:
            return self._transcribe_one(audio)

        chunk_s = int(SAMPLE_RATE * 15)
        overlap_s = int(SAMPLE_RATE * 2)
        results: list = []
        offset = 0
        while offset < len(audio):
            chunk = audio[offset : offset + chunk_s]
            if len(chunk) < SAMPLE_RATE * 2:
                break
            results.extend(self._transcribe_one(chunk))
            offset += chunk_s - overlap_s

        return self._dedup_segments(results)

    @staticmethod
    def _dedup_segments(segments: list) -> list:
        if len(segments) <= 1:
            return segments
        kept: list = [segments[0]]
        for seg in segments[1:]:
            prev_text = kept[-1].text
            curr_text = seg.text
            # Skip if current segment is a substring of previous or vice versa
            if curr_text in prev_text or prev_text in curr_text:
                if len(curr_text) > len(prev_text):
                    kept[-1] = seg
                continue
            kept.append(seg)
        return kept


class SessionManager:
    def __init__(self) -> None:
        self.transcriber = Transcriber()
        self.sessions: dict[str, StreamSession] = {}

    def create_session(self, stream_id: str) -> StreamSession:
        session = StreamSession(stream_id, self.transcriber)
        self.sessions[stream_id] = session
        return session

    def get_session(self, stream_id: str) -> StreamSession | None:
        return self.sessions.get(stream_id)

    def remove_session(self, stream_id: str) -> None:
        self.sessions.pop(stream_id, None)


manager = SessionManager()


async def handle_connection(websocket: ServerConnection) -> None:
    session: StreamSession | None = None
    logger.info("Client connected from %s", websocket.remote_address)

    try:
        async for message in websocket:
            if isinstance(message, bytes):
                if session is None:
                    await websocket.send(json.dumps({
                        "type": "stream-failed",
                        "stream_id": "",
                        "message": "Audio chunk received before stream started",
                        "retryable": False,
                    }))
                    continue
                if session.finished:
                    continue
                session.push_audio(message)
            elif isinstance(message, str):
                msg = json.loads(message)
                msg_type = msg.get("type")

                if msg_type == "start-stream":
                    session = manager.create_session(msg.get("stream_id", ""))
                    await websocket.send(json.dumps({
                        "type": "stream-started",
                        "stream_id": session.stream_id,
                    }))

                elif msg_type == "finish-stream":
                    if session:
                        events = session.flush()
                        for event in events:
                            await websocket.send(json.dumps(event, ensure_ascii=False))
                        session.finished = True
                        await websocket.send(json.dumps({
                            "type": "stream-completed",
                            "stream_id": session.stream_id,
                        }))

                elif msg_type == "cancel-stream":
                    if session:
                        session.finished = True
                        manager.remove_session(session.stream_id)
                        await websocket.send(json.dumps({
                            "type": "stream-completed",
                            "stream_id": session.stream_id,
                        }))
                    session = None

                else:
                    logger.warning("Unknown message type: %s", msg_type)
    except Exception as exc:
        logger.exception("Session error")
        if session:
            try:
                await websocket.send(json.dumps({
                    "type": "stream-failed",
                    "stream_id": session.stream_id,
                    "message": str(exc),
                    "retryable": False,
                }))
            except Exception:
                pass
    finally:
        if session:
            manager.remove_session(session.stream_id)
        logger.info("Client disconnected from %s", websocket.remote_address)


async def main() -> None:
    logger.info("Starting ASR server on port %d...", PORT)
    async with serve(handle_connection, "0.0.0.0", PORT) as server:
        logger.info("ASR server ready on ws://0.0.0.0:%d", PORT)
        await server.serve_forever()


if __name__ == "__main__":
    asyncio.run(main())
