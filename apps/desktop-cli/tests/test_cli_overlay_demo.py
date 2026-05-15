from __future__ import annotations

import sys

from desktop_cli.cli.main import main


def test_main_dispatches_overlay_demo_in_dry_run_mode() -> None:
    result = main(["overlay-demo", "--dry-run"])

    assert result == 0


def test_main_uses_process_argv_when_no_explicit_args_are_passed(
    monkeypatch,
) -> None:
    called_with: list[list[str]] = []

    def fake_overlay_demo(argv: list[str]) -> int:
        called_with.append(argv)
        return 0

    monkeypatch.setattr("desktop_cli.cli.main.run_overlay_demo", fake_overlay_demo)
    monkeypatch.setattr(sys, "argv", ["desktop-cli", "overlay-demo", "--dry-run"])

    assert main() == 0
    assert called_with == [["--dry-run"]]


def test_main_returns_nonzero_and_prints_readable_error_when_overlay_demo_fails(
    monkeypatch,
    capsys,
) -> None:
    def fake_overlay_demo(argv: list[str]) -> int:
        raise RuntimeError("overlay init failed")

    monkeypatch.setattr("desktop_cli.cli.main.run_overlay_demo", fake_overlay_demo)

    assert main(["overlay-demo"]) == 1
    captured = capsys.readouterr()
    assert "overlay init failed" in captured.out
