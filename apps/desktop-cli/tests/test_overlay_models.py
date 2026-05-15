from __future__ import annotations

from desktop_cli.config import AppConfig
from desktop_cli.overlay_window.models import (
    OverlaySubtitleState,
    create_overlay_state_from_config,
)


def test_overlay_subtitle_state_defaults_to_hidden_empty_values() -> None:
    state = OverlaySubtitleState()

    assert state.translated_text == ""
    assert state.source_text == ""
    assert state.show_source_text is False
    assert state.font_size == 32
    assert state.overlay_position == "bottom"
    assert state.background_opacity == 0.75
    assert state.visible is False


def test_create_overlay_state_from_config_uses_app_config_values() -> None:
    config = AppConfig(
        show_source_text=True,
        font_size=40,
        overlay_position="bottom",
        background_opacity=0.5,
    )

    state = create_overlay_state_from_config(
        config,
        translated_text="你好，世界",
        source_text="こんにちは、世界",
    )

    assert state.translated_text == "你好，世界"
    assert state.source_text == "こんにちは、世界"
    assert state.show_source_text is True
    assert state.font_size == 40
    assert state.overlay_position == "bottom"
    assert state.background_opacity == 0.5
    assert state.visible is True
