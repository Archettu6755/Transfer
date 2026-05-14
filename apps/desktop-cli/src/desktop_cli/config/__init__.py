"""Configuration boundary for the desktop CLI product."""

from __future__ import annotations

from dataclasses import dataclass


@dataclass(slots=True)
class AppConfig:
    """Minimal Phase 0 config boundary.

    This model only establishes field names. Loading strategy, precedence,
    persistence, and secret storage are deferred to later phases.
    """

    api_base_url: str = ""
    api_key: str = ""
    model_name: str = ""
    show_source_text: bool = False
    font_size: int = 32
    overlay_position: str = "bottom"
    background_opacity: float = 0.75
