"""Overlay subtitle state models."""

from __future__ import annotations

from dataclasses import dataclass

from desktop_cli.config import AppConfig


@dataclass(slots=True)
class OverlaySubtitleState:
    """Minimal Phase 4 display model for the overlay window."""

    translated_text: str = ""
    source_text: str = ""
    show_source_text: bool = False
    font_family: str = "Microsoft YaHei"
    font_size: int = 32
    overlay_position: str = "bottom"
    background_opacity: float = 0.75
    visible: bool = False


def create_overlay_state_from_config(
    config: AppConfig,
    translated_text: str,
    source_text: str = "",
) -> OverlaySubtitleState:
    """Project local config into a concrete overlay display state."""

    return OverlaySubtitleState(
        translated_text=translated_text,
        source_text=source_text,
        show_source_text=config.show_source_text,
        font_family=config.font_family,
        font_size=config.font_size,
        overlay_position=config.overlay_position,
        background_opacity=config.background_opacity,
        visible=bool(translated_text.strip()),
    )
