"""Formal desktop-cli product entrypoint."""

from __future__ import annotations

import argparse
from collections.abc import Sequence

from desktop_cli.audio_input import AudioInputConfig
from desktop_cli.config import (
    AppConfig,
    DEFAULT_BACKGROUND_OPACITY,
    DEFAULT_FONT_FAMILY,
    DEFAULT_FONT_SIZE,
)
from desktop_cli.config.providers import resolve_provider
from desktop_cli.config.storage import load_saved_config, resolve_env_value

from .session_demo import run_configured_session


def run_start(argv: Sequence[str] | None = None) -> int:
    parser = argparse.ArgumentParser(prog="desktop-cli start")
    parser.add_argument("--provider", "-p")
    parser.add_argument("--model", "-m")
    parser.add_argument("--font", "-f")
    parser.add_argument("--font-size", "-s", type=int)
    parser.add_argument("--bg", "-b", type=float)
    parser.add_argument("--source-text", action="store_true")
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args(list(argv) if argv is not None else None)

    saved = load_saved_config()
    provider_input = args.provider or saved.provider
    provider = resolve_provider(provider_input)
    provider_overridden = bool(args.provider and provider.canonical_name != saved.provider)

    model_name = (args.model or "").strip()
    if not model_name:
        if provider_overridden:
            model_name = provider.default_model_name
        else:
            model_name = saved.model_name

    api_key = resolve_env_value(provider.api_key_env_var)
    if not api_key:
        raise RuntimeError(
            f"Missing API key for provider '{provider.canonical_name}'. "
            f"Set {provider.api_key_env_var} in .env or the current environment."
        )
    if args.font_size is not None and args.font_size <= 0:
        raise RuntimeError("Font size must be greater than 0.")
    if args.bg is not None and not 0 <= args.bg <= 1:
        raise RuntimeError("Background opacity must be between 0 and 1.")

    config = AppConfig(
        provider=provider.canonical_name,
        api_base_url=provider.api_base_url,
        api_key=api_key,
        api_key_env_var=provider.api_key_env_var,
        model_name=model_name,
        runtime_mode="fake",
        translator_mode="openai-compatible",
        show_source_text=args.source_text or saved.show_source_text,
        font_family=args.font or saved.font_family or DEFAULT_FONT_FAMILY,
        font_size=(
            args.font_size if args.font_size is not None else saved.font_size or DEFAULT_FONT_SIZE
        ),
        background_opacity=(
            args.bg
            if args.bg is not None
            else saved.background_opacity
            if saved.background_opacity is not None
            else DEFAULT_BACKGROUND_OPACITY
        ),
    )
    audio_config = AudioInputConfig(source="test-tone", duration_ms=500)
    return run_configured_session(
        config=config,
        audio_config=audio_config,
        dry_run=args.dry_run,
        command_name="start",
    )
