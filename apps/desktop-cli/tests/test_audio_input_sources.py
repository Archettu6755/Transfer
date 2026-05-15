from __future__ import annotations

import pytest

from desktop_cli.audio_input import AudioInputConfig, LoopbackAudioInput, TestToneAudioInput


def test_test_tone_audio_input_emits_pcm16_chunk() -> None:
    source = TestToneAudioInput(
        AudioInputConfig(source="test-tone", duration_ms=200, chunk_ms=100)
    )

    source.start()
    first_chunk = source.read_chunk()
    second_chunk = source.read_chunk()
    source.stop()

    assert first_chunk is not None
    assert first_chunk.chunk_id == 0
    assert first_chunk.sample_rate == 16_000
    assert first_chunk.channels == 1
    assert first_chunk.duration_ms == 100
    assert len(first_chunk.pcm_bytes) == 3200
    assert second_chunk is not None
    assert second_chunk.chunk_id == 1


def test_test_tone_audio_input_returns_none_after_duration_limit() -> None:
    source = TestToneAudioInput(
        AudioInputConfig(source="test-tone", duration_ms=100, chunk_ms=100)
    )

    source.start()
    assert source.read_chunk() is not None
    assert source.read_chunk() is None
    source.stop()


def test_loopback_audio_input_raises_readable_error_when_sounddevice_unavailable(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    import desktop_cli.audio_input.loopback as loopback_module

    monkeypatch.setattr(
        loopback_module,
        "_SOUNDDEVICE_IMPORT_ERROR",
        RuntimeError("sounddevice unavailable"),
    )

    source = LoopbackAudioInput(AudioInputConfig(source="loopback"))

    with pytest.raises(RuntimeError, match="sounddevice"):
        source.start()
