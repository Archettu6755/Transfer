"""Local config and dotenv storage helpers for the formal desktop CLI."""

from __future__ import annotations

import json
import os
from pathlib import Path

from . import (
    DEFAULT_BACKGROUND_OPACITY,
    DEFAULT_FONT_FAMILY,
    DEFAULT_FONT_SIZE,
    SavedAppConfig,
)


CONFIG_FILE_NAME = ".desktop-cli.json"
DOTENV_FILE_NAME = ".env"


def get_app_root() -> Path:
    return Path(__file__).resolve().parents[3]


def get_config_path() -> Path:
    return get_app_root() / CONFIG_FILE_NAME


def get_dotenv_path() -> Path:
    return get_app_root() / DOTENV_FILE_NAME


def load_saved_config() -> SavedAppConfig:
    path = get_config_path()
    if not path.exists():
        raise RuntimeError("desktop-cli is not initialized. Run 'desktop-cli init' first.")

    try:
        payload = json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError as exc:
        raise RuntimeError(f"desktop-cli config at {path} is not valid JSON.") from exc

    if not isinstance(payload, dict):
        raise RuntimeError(f"desktop-cli config at {path} is malformed.")

    provider = str(payload.get("provider", "")).strip()
    model_name = str(payload.get("model_name", "")).strip()
    if not provider:
        raise RuntimeError(f"desktop-cli config at {path} is missing 'provider'.")
    if not model_name:
        raise RuntimeError(f"desktop-cli config at {path} is missing 'model_name'.")

    font_size = int(payload.get("font_size", DEFAULT_FONT_SIZE))
    background_opacity = float(
        payload.get("background_opacity", DEFAULT_BACKGROUND_OPACITY)
    )
    if font_size <= 0:
        raise RuntimeError(f"desktop-cli config at {path} has invalid 'font_size'.")
    if not 0 <= background_opacity <= 1:
        raise RuntimeError(f"desktop-cli config at {path} has invalid 'background_opacity'.")

    return SavedAppConfig(
        provider=provider,
        model_name=model_name,
        font_family=str(payload.get("font_family", DEFAULT_FONT_FAMILY)).strip()
        or DEFAULT_FONT_FAMILY,
        font_size=font_size,
        background_opacity=background_opacity,
        show_source_text=bool(payload.get("show_source_text", False)),
    )


def save_saved_config(config: SavedAppConfig) -> Path:
    path = get_config_path()
    payload = {
        "provider": config.provider,
        "model_name": config.model_name,
        "font_family": config.font_family,
        "font_size": config.font_size,
        "background_opacity": config.background_opacity,
        "show_source_text": config.show_source_text,
    }
    path.write_text(
        json.dumps(payload, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    return path


def load_dotenv_values() -> dict[str, str]:
    path = get_dotenv_path()
    values: dict[str, str] = {}
    if not path.exists():
        return values

    for raw_line in path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, _, value = raw_line.partition("=")
        values[key.strip()] = _strip_env_quotes(value.strip())
    return values


def save_dotenv_value(key: str, value: str) -> Path:
    path = get_dotenv_path()
    lines: list[str] = []
    if path.exists():
        lines = path.read_text(encoding="utf-8").splitlines()

    updated = False
    for index, raw_line in enumerate(lines):
        stripped = raw_line.strip()
        if not stripped or stripped.startswith("#") or "=" not in raw_line:
            continue
        existing_key, _, _ = raw_line.partition("=")
        if existing_key.strip() == key:
            lines[index] = f"{key}={value}"
            updated = True
            break

    if not updated:
        lines.append(f"{key}={value}")

    path.write_text("\n".join(lines) + "\n", encoding="utf-8")
    return path


def resolve_env_value(key: str) -> str:
    if key in os.environ and os.environ[key].strip():
        return os.environ[key].strip()

    values = load_dotenv_values()
    return values.get(key, "").strip()


def _strip_env_quotes(value: str) -> str:
    if len(value) >= 2 and value[0] == value[-1] and value[0] in {"'", '"'}:
        return value[1:-1]
    return value
