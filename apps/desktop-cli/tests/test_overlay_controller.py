from __future__ import annotations

from desktop_cli.config import AppConfig
from desktop_cli.overlay_window.controller import OverlayController


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


def test_overlay_controller_pushes_latest_subtitle_state_to_window() -> None:
    window = FakeOverlayWindow()
    controller = OverlayController(window)

    controller.show_subtitle(
        translated_text="这是最新的一条字幕",
        source_text="これは最新の字幕です",
        config=AppConfig(show_source_text=True, font_size=36),
    )

    assert len(window.updates) == 1
    state = window.updates[0]
    assert state.translated_text == "这是最新的一条字幕"
    assert state.source_text == "これは最新の字幕です"
    assert state.show_source_text is True
    assert state.font_family == "Microsoft YaHei"
    assert state.visible is True


def test_overlay_controller_hide_and_clear_delegate_to_window() -> None:
    window = FakeOverlayWindow()
    controller = OverlayController(window)

    controller.hide()
    controller.clear()

    assert window.hide_calls == 1
    assert window.clear_calls == 1
