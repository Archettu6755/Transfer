"""Standalone overlay demo entrypoint."""

from __future__ import annotations

import argparse
from collections.abc import Sequence

from desktop_cli.config import AppConfig


def run_overlay_demo(argv: Sequence[str] | None = None) -> int:
    parser = argparse.ArgumentParser(prog="desktop-cli overlay-demo")
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--show-source-text", action="store_true")
    parser.add_argument("--duration-ms", type=int, default=3500)
    args = parser.parse_args(list(argv) if argv is not None else None)

    if args.dry_run:
        print("overlay-demo dry run OK")
        return 0

    from desktop_cli.overlay_window.controller import OverlayController
    from desktop_cli.overlay_window.window import OverlayWindow, ensure_pyside6_available

    ensure_pyside6_available()

    from PySide6.QtCore import QTimer
    from PySide6.QtWidgets import QApplication

    app = QApplication.instance() or QApplication([])
    window = OverlayWindow()
    controller = OverlayController(window)
    config = AppConfig(show_source_text=args.show_source_text)

    controller.show_subtitle(
        translated_text="これは overlay-demo のテスト字幕です。",
        source_text="これは overlay-demo のテスト字幕です。",
        config=config,
    )

    QTimer.singleShot(args.duration_ms, controller.hide)
    QTimer.singleShot(args.duration_ms + 300, controller.clear)
    QTimer.singleShot(args.duration_ms + 600, app.quit)
    return app.exec()
