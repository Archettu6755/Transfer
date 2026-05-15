"""Synthetic audio source for validation without a real device."""

from __future__ import annotations

import math
import struct
from dataclasses import dataclass, field

from .models import AudioChunk, AudioInputConfig


@dataclass(slots=True)
class TestToneAudioInput:
    """Generate deterministic PCM16 mono chunks for validation."""

    __test__ = False

    config: AudioInputConfig
    frequency_hz: float = 440.0
    amplitude: int = 8_000
    _running: bool = field(default=False, init=False)
    _chunk_id: int = field(default=0, init=False)
    _sample_cursor: int = field(default=0, init=False)
    _max_chunks: int | None = field(default=None, init=False)

    def start(self) -> None:
        self._running = True
        self._chunk_id = 0
        self._sample_cursor = 0
        if self.config.duration_ms is None:
            self._max_chunks = None
            return

        self._max_chunks = max(1, math.ceil(self.config.duration_ms / self.config.chunk_ms))

    def read_chunk(self) -> AudioChunk | None:
        if not self._running:
            raise RuntimeError("Test tone input is not running.")

        if self._max_chunks is not None and self._chunk_id >= self._max_chunks:
            return None

        samples_per_chunk = int(self.config.sample_rate * self.config.chunk_ms / 1000)
        pcm = bytearray()
        for offset in range(samples_per_chunk):
            position = self._sample_cursor + offset
            angle = 2.0 * math.pi * self.frequency_hz * position / self.config.sample_rate
            sample = int(self.amplitude * math.sin(angle))
            pcm.extend(struct.pack("<h", sample))

        self._sample_cursor += samples_per_chunk
        chunk = AudioChunk(
            chunk_id=self._chunk_id,
            pcm_bytes=bytes(pcm),
            sample_rate=self.config.sample_rate,
            channels=self.config.channels,
            duration_ms=self.config.chunk_ms,
        )
        self._chunk_id += 1
        return chunk

    def stop(self) -> None:
        self._running = False
