"""Controller boundary for the local overlay window."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Protocol

from desktop_cli.config import AppConfig

from .models import OverlaySubtitleState, create_overlay_state_from_config


class OverlayWindowProtocol(Protocol):
    """Minimal API expected from an overlay window implementation."""

    def update_state(self, state: OverlaySubtitleState) -> None: ...

    def hide_overlay(self) -> None: ...

    def clear(self) -> None: ...


@dataclass(slots=True)
class OverlayController:
    """Keep overlay updates isolated from runtime and translation logic."""

    window: OverlayWindowProtocol

    def show_subtitle(
        self,
        translated_text: str,
        config: AppConfig,
        source_text: str = "",
    ) -> OverlaySubtitleState:
        state = create_overlay_state_from_config(
            config=config,
            translated_text=translated_text,
            source_text=source_text,
        )
        self.window.update_state(state)
        return state

    def hide(self) -> None:
        self.window.hide_overlay()

    def clear(self) -> None:
        self.window.clear()
