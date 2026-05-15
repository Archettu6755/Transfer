"""Real anime-whisper client skeleton for workstation-limited environments."""

from __future__ import annotations

from dataclasses import dataclass, field

from desktop_cli.audio_input import AudioChunk

from .client import (
    CancelStreamRequest,
    FinishStreamRequest,
    RuntimeClientConfig,
    RuntimeEvent,
    StartStreamRequest,
    TranscribeFileRequest,
    TranscribeFileResponse,
)

_BLOCKED_MESSAGE = (
    "anime-whisper runtime validation is blocked on this workstation per AGENTS-2.md. "
    "Use an ASR-capable Docker/WSL2 environment for real runtime verification."
)


@dataclass(slots=True)
class AnimeWhisperRuntimeClient:
    """Product-side real runtime client shape with readable local blocker errors."""

    _config: RuntimeClientConfig | None = field(default=None, init=False)

    async def init(self, config: RuntimeClientConfig) -> None:
        self._config = config
        raise RuntimeError(_BLOCKED_MESSAGE)

    async def transcribe_file(
        self, request: TranscribeFileRequest
    ) -> TranscribeFileResponse:
        raise RuntimeError(_BLOCKED_MESSAGE)

    async def start_stream(self, request: StartStreamRequest) -> list[RuntimeEvent]:
        raise RuntimeError(_BLOCKED_MESSAGE)

    async def push_chunk(self, chunk: AudioChunk) -> list[RuntimeEvent]:
        raise RuntimeError(_BLOCKED_MESSAGE)

    async def finish_stream(self, request: FinishStreamRequest) -> list[RuntimeEvent]:
        raise RuntimeError(_BLOCKED_MESSAGE)

    async def cancel_stream(self, request: CancelStreamRequest) -> list[RuntimeEvent]:
        return []

    async def dispose(self) -> None:
        return None
