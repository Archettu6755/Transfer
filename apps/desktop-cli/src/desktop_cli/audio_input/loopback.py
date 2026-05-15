"""Windows loopback audio input boundary."""

from __future__ import annotations

from dataclasses import dataclass, field
import inspect
from queue import Empty, Queue

from .models import AudioChunk, AudioInputConfig

try:
    import sounddevice as sd
except ImportError as exc:  # pragma: no cover - exercised by environment
    sd = None  # type: ignore[assignment]
    _SOUNDDEVICE_IMPORT_ERROR = exc
else:
    _SOUNDDEVICE_IMPORT_ERROR = None


def ensure_sounddevice_available() -> None:
    """Raise a readable error when sounddevice is unavailable."""

    if _SOUNDDEVICE_IMPORT_ERROR is not None:
        raise RuntimeError(
            "sounddevice is not available for loopback audio input. "
            "Install desktop-cli audio dependencies before using loopback."
        ) from _SOUNDDEVICE_IMPORT_ERROR


def list_output_devices() -> list[str]:
    """List output-capable audio devices for loopback troubleshooting."""

    ensure_sounddevice_available()
    devices = sd.query_devices()
    return [
        f"{index}: {device['name']}"
        for index, device in enumerate(devices)
        if int(device.get("max_output_channels", 0)) > 0
    ]


@dataclass(slots=True)
class LoopbackAudioInput:
    """Raw WASAPI loopback stream wrapper for Phase 5."""

    config: AudioInputConfig
    _queue: Queue[bytes] = field(default_factory=Queue, init=False)
    _stream: object | None = field(default=None, init=False)
    _chunk_id: int = field(default=0, init=False)
    _running: bool = field(default=False, init=False)

    def start(self) -> None:
        ensure_sounddevice_available()

        if not hasattr(sd, "WasapiSettings"):
            raise RuntimeError("WASAPI loopback is not available in this sounddevice build.")

        output_device = self._resolve_output_device()
        blocksize = int(self.config.sample_rate * self.config.chunk_ms / 1000)
        extra = self._create_wasapi_loopback_settings()

        def callback(indata, frames, _time, status) -> None:
            if status:
                raise RuntimeError(f"Loopback audio error: {status}")
            self._queue.put(bytes(indata))

        try:
            stream = sd.RawInputStream(
                samplerate=self.config.sample_rate,
                blocksize=blocksize,
                device=output_device,
                channels=self.config.channels,
                dtype="int16",
                callback=callback,
                extra_settings=extra,
            )
            stream.start()
        except Exception as exc:  # pragma: no cover - depends on local audio stack
            raise RuntimeError(f"Loopback audio input failed: {exc}") from exc

        self._stream = stream
        self._chunk_id = 0
        self._running = True

    def read_chunk(self) -> AudioChunk | None:
        if not self._running:
            raise RuntimeError("Loopback audio input is not running.")

        try:
            pcm_bytes = self._queue.get(timeout=1.0)
        except Empty:
            return None

        chunk = AudioChunk(
            chunk_id=self._chunk_id,
            pcm_bytes=pcm_bytes,
            sample_rate=self.config.sample_rate,
            channels=self.config.channels,
            duration_ms=self.config.chunk_ms,
        )
        self._chunk_id += 1
        return chunk

    def stop(self) -> None:
        stream = self._stream
        self._running = False
        self._stream = None
        if stream is None:
            return

        try:
            stream.stop()
            stream.close()
        except Exception:
            return

    def _resolve_output_device(self) -> int:
        default_input, default_output = sd.default.device
        if self.config.device_name is None:
            if default_output is None or default_output < 0:
                raise RuntimeError("No default output device is available for loopback.")
            return int(default_output)

        devices = sd.query_devices()
        target = self.config.device_name.casefold()
        for index, device in enumerate(devices):
            if int(device.get("max_output_channels", 0)) <= 0:
                continue
            if target in str(device.get("name", "")).casefold():
                return index

        raise RuntimeError(
            f"Loopback output device '{self.config.device_name}' was not found."
        )

    def _create_wasapi_loopback_settings(self):
        signature = inspect.signature(sd.WasapiSettings)
        if "loopback" not in signature.parameters:
            raise RuntimeError(
                "This sounddevice build does not expose a WASAPI loopback flag. "
                "Use test-tone for validation or install a loopback-capable configuration."
            )

        try:
            return sd.WasapiSettings(loopback=True)
        except TypeError as exc:  # pragma: no cover - defensive against API mismatch
            raise RuntimeError(
                "WASAPI loopback could not be enabled in this sounddevice build."
            ) from exc
