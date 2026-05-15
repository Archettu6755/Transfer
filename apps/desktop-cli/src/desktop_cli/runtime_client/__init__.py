"""Runtime client module boundary for anime-whisper integration."""

from .anime_whisper import AnimeWhisperRuntimeClient
from .client import (
    AudioChunkRequest,
    AudioInputPayload,
    CancelStreamRequest,
    FinalTranscriptEvent,
    FinishStreamRequest,
    LocalAsrSegment,
    PartialTranscriptEvent,
    RuntimeClient,
    RuntimeClientConfig,
    RuntimeEvent,
    StartStreamRequest,
    StreamCompletedEvent,
    StreamFailedEvent,
    StreamStartedEvent,
    TranscribeFileRequest,
    TranscribeFileResponse,
)
from .fake import FakeRuntimeClient

__all__ = [
    "AnimeWhisperRuntimeClient",
    "AudioChunkRequest",
    "AudioInputPayload",
    "CancelStreamRequest",
    "FakeRuntimeClient",
    "FinalTranscriptEvent",
    "FinishStreamRequest",
    "LocalAsrSegment",
    "PartialTranscriptEvent",
    "RuntimeClient",
    "RuntimeClientConfig",
    "RuntimeEvent",
    "StartStreamRequest",
    "StreamCompletedEvent",
    "StreamFailedEvent",
    "StreamStartedEvent",
    "TranscribeFileRequest",
    "TranscribeFileResponse",
]
