"""Integrated Phase 6 session demo with swappable runtime/translator modes."""

from __future__ import annotations

import argparse
import asyncio
from collections.abc import Sequence

from desktop_cli.audio_input import AudioInputConfig, LoopbackAudioInput, TestToneAudioInput
from desktop_cli.config import AppConfig
from desktop_cli.overlay_window import OverlayController
from desktop_cli.runtime_client import (
    AnimeWhisperRuntimeClient,
    FakeRuntimeClient,
    RuntimeClientConfig,
)
from desktop_cli.subtitle_controller import SubtitleController
from desktop_cli.translator_client import (
    MockTranslatorClient,
    OpenAICompatibleTranslatorClient,
)


def run_session_demo(argv: Sequence[str] | None = None) -> int:
    parser = argparse.ArgumentParser(prog="desktop-cli session-demo")
    parser.add_argument(
        "--runtime-mode",
        choices=["fake", "anime-whisper"],
        default="fake",
    )
    parser.add_argument(
        "--translator-mode",
        choices=["mock", "openai-compatible"],
        default="mock",
    )
    parser.add_argument(
        "--audio-source",
        choices=["test-tone", "loopback"],
        default="test-tone",
    )
    parser.add_argument("--duration-ms", type=int, default=500)
    parser.add_argument("--show-source-text", action="store_true")
    parser.add_argument("--api-base-url", default="")
    parser.add_argument("--api-key", default="")
    parser.add_argument("--model-name", default="")
    parser.add_argument("--timeout-ms", type=int, default=30_000)
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args(list(argv) if argv is not None else None)

    if args.dry_run:
        print("session-demo dry run OK")
        return 0

    from desktop_cli.overlay_window.window import OverlayWindow, ensure_pyside6_available

    ensure_pyside6_available()

    from PySide6.QtWidgets import QApplication

    config = AppConfig(
        api_base_url=args.api_base_url,
        api_key=args.api_key,
        model_name=args.model_name,
        runtime_mode=args.runtime_mode,
        translator_mode=args.translator_mode,
        translator_timeout_ms=args.timeout_ms,
        show_source_text=args.show_source_text,
    )
    audio_config = AudioInputConfig(
        source=args.audio_source,
        duration_ms=args.duration_ms,
    )

    app = QApplication.instance() or QApplication([])
    window = OverlayWindow()
    overlay_controller = OverlayController(window)
    controller = SubtitleController(
        runtime_client=_create_runtime_client(config),
        runtime_config=RuntimeClientConfig(base_url="http://127.0.0.1:0", timeout_ms=args.timeout_ms),
        translator_client=_create_translator_client(config),
        overlay_controller=overlay_controller,
        audio_input=_create_audio_source(audio_config),
        app_config=config,
    )

    app.processEvents()
    state = asyncio.run(controller.run())
    app.processEvents()

    if state.last_error:
        print(f"session-demo failed: {state.last_error}")
        return 1

    print(
        "session-demo completed: "
        f"runtime={state.runtime_mode} translator={state.translator_mode}"
    )
    return 0


def _create_audio_source(config: AudioInputConfig):
    if config.source == "test-tone":
        return TestToneAudioInput(config)
    return LoopbackAudioInput(config)


def _create_runtime_client(config: AppConfig):
    if config.runtime_mode == "fake":
        return FakeRuntimeClient()
    return AnimeWhisperRuntimeClient()


def _create_translator_client(config: AppConfig):
    if config.translator_mode == "mock":
        return MockTranslatorClient()
    return OpenAICompatibleTranslatorClient(config=config)
