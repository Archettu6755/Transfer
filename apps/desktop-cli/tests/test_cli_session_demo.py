from __future__ import annotations

import os
import sys

from desktop_cli.cli.main import main
from desktop_cli.cli.session_demo import run_session_demo


def test_main_dispatches_session_demo_in_dry_run_mode() -> None:
    assert (
        main(
            [
                "session-demo",
                "--runtime-mode",
                "fake",
                "--translator-mode",
                "mock",
                "--dry-run",
            ]
        )
        == 0
    )


def test_main_uses_process_argv_for_session_demo(monkeypatch) -> None:
    called_with: list[list[str]] = []

    def fake_session_demo(argv: list[str]) -> int:
        called_with.append(argv)
        return 0

    monkeypatch.setattr("desktop_cli.cli.main.run_session_demo", fake_session_demo)
    monkeypatch.setattr(
        sys,
        "argv",
        ["desktop-cli", "session-demo", "--runtime-mode", "fake", "--dry-run"],
    )

    assert main() == 0
    assert called_with == [["--runtime-mode", "fake", "--dry-run"]]


def test_session_demo_fake_mock_test_tone_succeeds_offscreen(monkeypatch) -> None:
    monkeypatch.setenv("QT_QPA_PLATFORM", "offscreen")

    result = run_session_demo(
        [
            "--runtime-mode",
            "fake",
            "--translator-mode",
            "mock",
            "--audio-source",
            "test-tone",
            "--duration-ms",
            "200",
        ]
    )

    assert result == 0


def test_session_demo_anime_whisper_mode_reports_connection_failure_readably(
    monkeypatch,
    capsys,
) -> None:
    monkeypatch.setenv("QT_QPA_PLATFORM", "offscreen")

    result = run_session_demo(
        [
            "--runtime-mode",
            "anime-whisper",
            "--translator-mode",
            "mock",
            "--audio-source",
            "test-tone",
            "--duration-ms",
            "200",
        ]
    )

    captured = capsys.readouterr()
    if result == 0:
        assert "session-demo completed" in captured.out
        return
    assert "anime-whisper ASR server" in captured.out or "Could not connect" in captured.out
