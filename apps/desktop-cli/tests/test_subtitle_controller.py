from __future__ import annotations

import asyncio

from desktop_cli.audio_input import AudioChunk
from desktop_cli.config import AppConfig
from desktop_cli.overlay_window import OverlayController
from desktop_cli.runtime_client import FakeRuntimeClient, RuntimeClientConfig
from desktop_cli.subtitle_controller import SubtitleController
from desktop_cli.translator_client import MockTranslatorClient


class FakeOverlayWindow:
    def __init__(self) -> None:
        self.updates = []
        self.hide_calls = 0
        self.clear_calls = 0

    def update_state(self, state: object) -> None:
        self.updates.append(state)

    def hide_overlay(self) -> None:
        self.hide_calls += 1

    def clear(self) -> None:
        self.clear_calls += 1


class FakeAudioInput:
    def __init__(self, chunks: list[AudioChunk]) -> None:
        self._chunks = list(chunks)
        self.start_calls = 0
        self.stop_calls = 0

    def start(self) -> None:
        self.start_calls += 1

    def read_chunk(self) -> AudioChunk | None:
        if not self._chunks:
            return None
        return self._chunks.pop(0)

    def stop(self) -> None:
        self.stop_calls += 1


class FailingTranslator:
    async def translate(self, request) -> object:
        raise RuntimeError("translator offline")


def _chunk(chunk_id: int) -> AudioChunk:
    return AudioChunk(
        chunk_id=chunk_id,
        pcm_bytes=b"\x00\x00",
        sample_rate=16_000,
        channels=1,
        duration_ms=100,
    )


def test_subtitle_controller_runs_final_transcript_to_translation_and_overlay() -> None:
    window = FakeOverlayWindow()
    controller = SubtitleController(
        runtime_client=FakeRuntimeClient(final_after_chunks=1),
        runtime_config=RuntimeClientConfig(base_url="mock://fake"),
        translator_client=MockTranslatorClient(),
        overlay_controller=OverlayController(window),
        audio_input=FakeAudioInput([_chunk(0)]),
        app_config=AppConfig(show_source_text=True),
        auto_hide_ms=0,
    )

    state = asyncio.run(controller.run())

    assert state.status == "stopped"
    assert state.last_source_text == "これはフェイク runtime の最終文字起こしです。"
    assert state.last_translated_text == "模拟翻译：これはフェイク runtime の最終文字起こしです。"
    assert len(window.updates) == 1
    assert window.updates[0].translated_text.startswith("模拟翻译：")
    assert window.hide_calls == 0
    assert window.clear_calls == 0


def test_subtitle_controller_uses_source_fallback_when_translation_fails() -> None:
    window = FakeOverlayWindow()
    controller = SubtitleController(
        runtime_client=FakeRuntimeClient(final_after_chunks=1),
        runtime_config=RuntimeClientConfig(base_url="mock://fake"),
        translator_client=FailingTranslator(),
        overlay_controller=OverlayController(window),
        audio_input=FakeAudioInput([_chunk(0)]),
        app_config=AppConfig(show_source_text=True),
        auto_hide_ms=0,
    )

    state = asyncio.run(controller.run())

    assert state.status == "error"
    assert "translator offline" in state.last_error
    assert state.last_translated_text == state.last_source_text
    assert len(window.updates) == 1
    assert window.updates[0].translated_text == state.last_source_text


def test_subtitle_controller_stop_resets_state_and_cleans_up() -> None:
    window = FakeOverlayWindow()
    controller = SubtitleController(
        runtime_client=FakeRuntimeClient(),
        runtime_config=RuntimeClientConfig(base_url="mock://fake"),
        translator_client=MockTranslatorClient(),
        overlay_controller=OverlayController(window),
        audio_input=FakeAudioInput([]),
        app_config=AppConfig(runtime_mode="fake", translator_mode="mock"),
    )
    controller.state.last_source_text = "stale"
    controller.state.last_translated_text = "stale"
    controller.state.last_error = "stale"

    asyncio.run(controller.stop())

    assert controller.state.status == "idle"
    assert controller.state.last_source_text == ""
    assert controller.state.last_translated_text == ""
    assert controller.state.last_error == ""
    assert window.hide_calls == 1
    assert window.clear_calls == 1
