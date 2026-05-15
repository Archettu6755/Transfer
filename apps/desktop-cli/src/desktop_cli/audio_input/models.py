"""Shared models and interfaces for live audio input."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Literal, Protocol


@dataclass(slots=True)
class AudioInputConfig:
    """Minimal Phase 5 configuration for audio input sources."""

    source: Literal["loopback", "test-tone"]
    sample_rate: int = 16_000
    channels: int = 1
    chunk_ms: int = 100
    duration_ms: int | None = None
    device_name: str | None = None


@dataclass(slots=True)
class AudioChunk:
    """PCM16 audio chunk emitted by an audio input source."""

    chunk_id: int
    pcm_bytes: bytes
    sample_rate: int
    channels: int
    duration_ms: int


@dataclass(slots=True)
class AudioInputStatus:
    """Readable state for live audio input."""

    state: Literal["idle", "running", "stopped", "error"]
    message: str = ""


class AudioInputSource(Protocol):
    """Synchronous pull-based audio input interface for Phase 5."""

    def start(self) -> None: ...

    def read_chunk(self) -> AudioChunk | None: ...

    def stop(self) -> None: ...
