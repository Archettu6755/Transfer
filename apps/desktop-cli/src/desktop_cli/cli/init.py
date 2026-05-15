"""Interactive desktop-cli initialization flow."""

from __future__ import annotations

import argparse
import getpass
from collections.abc import Sequence

from desktop_cli.config import (
    DEFAULT_BACKGROUND_OPACITY,
    DEFAULT_FONT_FAMILY,
    DEFAULT_FONT_SIZE,
    SavedAppConfig,
)
from desktop_cli.config.models import get_flagship_model
from desktop_cli.config.providers import resolve_provider
from desktop_cli.config.storage import save_dotenv_value, save_saved_config


def run_init(argv: Sequence[str] | None = None) -> int:
    parser = argparse.ArgumentParser(prog="desktop-cli init")
    parser.parse_args(list(argv) if argv is not None else None)

    print("Recommended providers: deepseek, qwen")
    provider_input = _prompt_non_empty("Please input provider name: ")
    provider = resolve_provider(provider_input)
    flagship_model = get_flagship_model(provider.canonical_name)
    print(f"Canonical provider: {provider.canonical_name}")
    print(f"Recommended model: {provider.default_model_name}")
    print(f"Flagship model: {flagship_model.model_name}")

    model_name = _prompt_with_default(
        "Please input the model", provider.default_model_name
    )
    api_key = _prompt_secret("Please input your API key: ")
    font_family = _prompt_with_default("Please input font family", DEFAULT_FONT_FAMILY)
    font_size = _prompt_int_with_default("Please input font size", DEFAULT_FONT_SIZE)
    background_opacity = _prompt_float_with_default(
        "Please input background opacity", DEFAULT_BACKGROUND_OPACITY
    )
    show_source_text = _prompt_bool_with_default("Show source text", False)

    saved_config = SavedAppConfig(
        provider=provider.canonical_name,
        model_name=model_name,
        font_family=font_family,
        font_size=font_size,
        background_opacity=background_opacity,
        show_source_text=show_source_text,
    )
    config_path = save_saved_config(saved_config)
    dotenv_path = save_dotenv_value(provider.api_key_env_var, api_key)

    print(f"Saved desktop-cli config to {config_path}")
    print(f"Saved API key to {dotenv_path} as {provider.api_key_env_var}")
    return 0


def _prompt_non_empty(prompt: str) -> str:
    while True:
        value = input(prompt).strip()
        if value:
            return value
        print("Value cannot be empty.")


def _prompt_with_default(label: str, default: str) -> str:
    value = input(f"{label} [{default}]: ").strip()
    return value or default


def _prompt_secret(prompt: str) -> str:
    while True:
        value = getpass.getpass(prompt).strip()
        if value:
            return value
        print("API key cannot be empty.")


def _prompt_int_with_default(label: str, default: int) -> int:
    while True:
        raw = input(f"{label} [{default}]: ").strip()
        if not raw:
            return default
        try:
            value = int(raw)
        except ValueError:
            print("Please input a valid integer.")
            continue
        if value <= 0:
            print("Value must be greater than 0.")
            continue
        return value


def _prompt_float_with_default(label: str, default: float) -> float:
    while True:
        raw = input(f"{label} [{default}]: ").strip()
        if not raw:
            return default
        try:
            value = float(raw)
        except ValueError:
            print("Please input a valid number.")
            continue
        if not 0 <= value <= 1:
            print("Value must be between 0 and 1.")
            continue
        return value


def _prompt_bool_with_default(label: str, default: bool) -> bool:
    default_hint = "y" if default else "n"
    while True:
        raw = input(f"{label}? [y/n, default {default_hint}]: ").strip().lower()
        if not raw:
            return default
        if raw in {"y", "yes"}:
            return True
        if raw in {"n", "no"}:
            return False
        print("Please answer y or n.")
