"""Runtime client protocols and event models for local ASR integration."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Literal, Protocol, TypeAlias

from desktop_cli.audio_input import AudioChunk


@dataclass(slots=True)
class RuntimeClientConfig:
    base_url: str
    timeout_ms: int = 30_000


@dataclass(slots=True)
class AudioInputPayload:
    id: str
    sample_rate: int
    duration_ms: int | None = None


@dataclass(slots=True)
class TranscribeFileRequest:
    request_id: str
    audio: AudioInputPayload
    source_lang: str = "ja"
    file_name: str | None = None
    mime_type: str | None = None


@dataclass(slots=True)
class TranscribeFileResponse:
    request_id: str
    text: str
    lang: str = "ja"
    latency_ms: int | None = None


@dataclass(slots=True)
class LocalAsrSegment:
    id: str
    text: str
    is_final: bool
    start_ms: int | None = None
    end_ms: int | None = None


@dataclass(slots=True)
class StartStreamRequest:
    type: Literal["start-stream"] = "start-stream"
    stream_id: str = ""
    source_lang: str = "ja"
    sample_rate: int = 16_000


@dataclass(slots=True)
class AudioChunkRequest:
    type: Literal["audio-chunk"] = "audio-chunk"
    stream_id: str = ""
    chunk_id: int = 0
    sample_rate: int = 16_000


@dataclass(slots=True)
class FinishStreamRequest:
    type: Literal["finish-stream"] = "finish-stream"
    stream_id: str = ""


@dataclass(slots=True)
class CancelStreamRequest:
    type: Literal["cancel-stream"] = "cancel-stream"
    stream_id: str = ""
    reason: str | None = None


@dataclass(slots=True)
class StreamStartedEvent:
    type: Literal["stream-started"] = "stream-started"
    stream_id: str = ""


@dataclass(slots=True)
class PartialTranscriptEvent:
    type: Literal["partial-transcript"] = "partial-transcript"
    stream_id: str = ""
    segment: LocalAsrSegment | None = None


@dataclass(slots=True)
class FinalTranscriptEvent:
    type: Literal["final-transcript"] = "final-transcript"
    stream_id: str = ""
    segment: LocalAsrSegment | None = None


@dataclass(slots=True)
class StreamCompletedEvent:
    type: Literal["stream-completed"] = "stream-completed"
    stream_id: str = ""


@dataclass(slots=True)
class StreamFailedEvent:
    type: Literal["stream-failed"] = "stream-failed"
    stream_id: str = ""
    message: str = ""
    retryable: bool = False


RuntimeEvent: TypeAlias = (
    StreamStartedEvent
    | PartialTranscriptEvent
    | FinalTranscriptEvent
    | StreamCompletedEvent
    | StreamFailedEvent
)


class RuntimeClient(Protocol):
    async def init(self, config: RuntimeClientConfig) -> None: ...

    async def transcribe_file(
        self, request: TranscribeFileRequest
    ) -> TranscribeFileResponse: ...

    async def start_stream(self, request: StartStreamRequest) -> list[RuntimeEvent]: ...

    async def push_chunk(self, chunk: AudioChunk) -> list[RuntimeEvent]: ...

    async def finish_stream(self, request: FinishStreamRequest) -> list[RuntimeEvent]: ...

    async def cancel_stream(self, request: CancelStreamRequest) -> list[RuntimeEvent]: ...

    async def dispose(self) -> None: ...
