from __future__ import annotations

from desktop_cli.audio_input import AudioChunk, AudioInputConfig, AudioInputStatus


def test_audio_input_config_defaults_match_phase5_contract() -> None:
    config = AudioInputConfig(source="test-tone")

    assert config.source == "test-tone"
    assert config.sample_rate == 16_000
    assert config.channels == 1
    assert config.chunk_ms == 100
    assert config.duration_ms is None
    assert config.device_name is None


def test_audio_chunk_and_status_have_expected_fields() -> None:
    chunk = AudioChunk(
        chunk_id=3,
        pcm_bytes=b"\x00\x01",
        sample_rate=16_000,
        channels=1,
        duration_ms=100,
    )
    status = AudioInputStatus(state="running", message="ok")

    assert chunk.chunk_id == 3
    assert chunk.sample_rate == 16_000
    assert chunk.channels == 1
    assert chunk.duration_ms == 100
    assert status.state == "running"
    assert status.message == "ok"
