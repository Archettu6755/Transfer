from __future__ import annotations

import sys

from desktop_cli.cli.main import main


def test_main_dispatches_audio_input_demo_in_dry_run_mode() -> None:
    assert main(["audio-input-demo", "--source", "test-tone", "--dry-run"]) == 0


def test_main_uses_process_argv_for_audio_input_demo(monkeypatch) -> None:
    called_with: list[list[str]] = []

    def fake_audio_input_demo(argv: list[str]) -> int:
        called_with.append(argv)
        return 0

    monkeypatch.setattr(
        "desktop_cli.cli.main.run_audio_input_demo",
        fake_audio_input_demo,
    )
    monkeypatch.setattr(
        sys,
        "argv",
        ["desktop-cli", "audio-input-demo", "--source", "test-tone", "--dry-run"],
    )

    assert main() == 0
    assert called_with == [["--source", "test-tone", "--dry-run"]]


def test_main_returns_nonzero_on_audio_input_demo_runtime_error(
    monkeypatch,
    capsys,
) -> None:
    def fake_audio_input_demo(argv: list[str]) -> int:
        raise RuntimeError("audio input failed")

    monkeypatch.setattr(
        "desktop_cli.cli.main.run_audio_input_demo",
        fake_audio_input_demo,
    )

    assert main(["audio-input-demo", "--source", "loopback"]) == 1
    captured = capsys.readouterr()
    assert "audio input failed" in captured.out
