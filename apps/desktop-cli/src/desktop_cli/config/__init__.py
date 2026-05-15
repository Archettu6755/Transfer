"""Configuration boundary for the desktop CLI product."""

from __future__ import annotations

from dataclasses import dataclass


DEFAULT_FONT_FAMILY = "Microsoft YaHei"
DEFAULT_FONT_SIZE = 32
DEFAULT_BACKGROUND_OPACITY = 0.75


@dataclass(slots=True)
class AppConfig:
    """Runtime configuration for the local desktop workflow."""

    provider: str = ""
    api_base_url: str = ""
    api_key: str = ""
    api_key_env_var: str = ""
    model_name: str = ""
    runtime_mode: str = "fake"
    translator_mode: str = "mock"
    translator_timeout_ms: int = 30_000
    show_source_text: bool = False
    font_family: str = DEFAULT_FONT_FAMILY
    font_size: int = DEFAULT_FONT_SIZE
    overlay_position: str = "bottom"
    background_opacity: float = DEFAULT_BACKGROUND_OPACITY


@dataclass(slots=True)
class SavedAppConfig:
    """Non-sensitive persisted config for the formal CLI entrypoint."""

    provider: str
    model_name: str
    font_family: str = DEFAULT_FONT_FAMILY
    font_size: int = DEFAULT_FONT_SIZE
    background_opacity: float = DEFAULT_BACKGROUND_OPACITY
    show_source_text: bool = False
