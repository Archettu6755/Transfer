from __future__ import annotations

import json
import sys
from pathlib import Path

import pytest

from desktop_cli.cli.main import main
from desktop_cli.cli.start import run_start
from desktop_cli.config.providers import resolve_provider


def _write_saved_config(
    root: Path,
    *,
    provider: str = "zhipu",
    model_name: str = "GLM-4.7-FlashX",
    font_family: str = "Microsoft YaHei",
    font_size: int = 32,
    background_opacity: float = 0.75,
    show_source_text: bool = False,
) -> None:
    payload = {
        "provider": provider,
        "model_name": model_name,
        "font_family": font_family,
        "font_size": font_size,
        "background_opacity": background_opacity,
        "show_source_text": show_source_text,
    }
    (root / ".desktop-cli.json").write_text(
        json.dumps(payload, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )


def _write_dotenv(root: Path, values: dict[str, str]) -> None:
    lines = [f"{key}={value}" for key, value in values.items()]
    (root / ".env").write_text("\n".join(lines) + "\n", encoding="utf-8")


def _patch_app_root(monkeypatch, root: Path) -> None:
    monkeypatch.setattr("desktop_cli.config.storage.get_app_root", lambda: root)


def test_run_start_dry_run_mode_reads_saved_config_and_env(tmp_path, monkeypatch) -> None:
    _patch_app_root(monkeypatch, tmp_path)
    _write_saved_config(tmp_path)
    _write_dotenv(tmp_path, {"DESKTOP_CLI_ZHIPU_API_KEY": "dotenv-zhipu-key"})

    assert run_start(["--dry-run"]) == 0


def test_main_dispatches_start_in_dry_run_mode(tmp_path, monkeypatch) -> None:
    _patch_app_root(monkeypatch, tmp_path)
    _write_saved_config(tmp_path)
    _write_dotenv(tmp_path, {"DESKTOP_CLI_ZHIPU_API_KEY": "dotenv-zhipu-key"})

    assert main(["start", "--dry-run"]) == 0


def test_main_without_subcommand_runs_start(monkeypatch) -> None:
    called_with: list[list[str]] = []

    def fake_start(argv: list[str]) -> int:
        called_with.append(argv)
        return 0

    monkeypatch.setattr("desktop_cli.cli.main.run_start", fake_start)

    assert main([]) == 0
    assert called_with == [[]]


def test_main_uses_process_argv_for_start(monkeypatch, tmp_path) -> None:
    called_with: list[list[str]] = []

    def fake_start(argv: list[str]) -> int:
        called_with.append(argv)
        return 0

    monkeypatch.setattr("desktop_cli.cli.main.run_start", fake_start)
    monkeypatch.setattr(sys, "argv", ["desktop-cli", "start", "--dry-run"])

    assert main() == 0
    assert called_with == [["--dry-run"]]


def test_start_uses_env_var_when_it_overrides_dotenv(tmp_path, monkeypatch) -> None:
    _patch_app_root(monkeypatch, tmp_path)
    _write_saved_config(tmp_path)
    _write_dotenv(tmp_path, {"DESKTOP_CLI_ZHIPU_API_KEY": "dotenv-zhipu-key"})
    monkeypatch.setenv("DESKTOP_CLI_ZHIPU_API_KEY", "process-zhipu-key")

    captured: dict[str, object] = {}

    def fake_run_configured_session(**kwargs) -> int:
        captured.update(kwargs)
        return 0

    monkeypatch.setattr("desktop_cli.cli.start.run_configured_session", fake_run_configured_session)

    assert run_start(["--dry-run"]) == 0
    assert captured["config"].api_key == "process-zhipu-key"


def test_start_provider_override_switches_provider_mapping(tmp_path, monkeypatch) -> None:
    _patch_app_root(monkeypatch, tmp_path)
    _write_saved_config(tmp_path, provider="deepseek", model_name="deepseek-v4-flash")
    _write_dotenv(
        tmp_path,
        {
            "DESKTOP_CLI_DEEPSEEK_API_KEY": "deepseek-key",
            "DESKTOP_CLI_ZHIPU_API_KEY": "zhipu-key",
        },
    )

    captured: dict[str, object] = {}

    def fake_run_configured_session(**kwargs) -> int:
        captured.update(kwargs)
        return 0

    monkeypatch.setattr("desktop_cli.cli.start.run_configured_session", fake_run_configured_session)

    assert run_start(["--provider", "glm", "--dry-run"]) == 0
    config = captured["config"]
    provider = resolve_provider("glm")
    assert config.provider == "zhipu"
    assert config.api_base_url == provider.api_base_url
    assert config.api_key == "zhipu-key"
    assert config.model_name == provider.default_model_name
    assert config.translator_mode == "openai-compatible"


def test_start_reports_missing_api_key_env_var_readably(tmp_path, monkeypatch) -> None:
    _patch_app_root(monkeypatch, tmp_path)
    _write_saved_config(tmp_path)

    with pytest.raises(RuntimeError, match="DESKTOP_CLI_ZHIPU_API_KEY"):
        run_start(["--dry-run"])


def test_start_reports_missing_config_readably(tmp_path, monkeypatch) -> None:
    _patch_app_root(monkeypatch, tmp_path)

    with pytest.raises(RuntimeError, match="desktop-cli is not initialized"):
        run_start(["--dry-run"])


def test_start_rejects_api_base_url_flag(tmp_path, monkeypatch) -> None:
    _patch_app_root(monkeypatch, tmp_path)
    _write_saved_config(tmp_path)
    _write_dotenv(tmp_path, {"DESKTOP_CLI_ZHIPU_API_KEY": "dotenv-zhipu-key"})

    with pytest.raises(SystemExit):
        run_start(["--api-base-url", "https://example.com", "--dry-run"])


def test_start_rejects_internal_runtime_mode_flag(tmp_path, monkeypatch) -> None:
    _patch_app_root(monkeypatch, tmp_path)
    _write_saved_config(tmp_path)
    _write_dotenv(tmp_path, {"DESKTOP_CLI_ZHIPU_API_KEY": "dotenv-zhipu-key"})

    with pytest.raises(SystemExit):
        run_start(["--runtime-mode", "fake", "--dry-run"])


def test_start_rejects_internal_translator_mode_flag(tmp_path, monkeypatch) -> None:
    _patch_app_root(monkeypatch, tmp_path)
    _write_saved_config(tmp_path)
    _write_dotenv(tmp_path, {"DESKTOP_CLI_ZHIPU_API_KEY": "dotenv-zhipu-key"})

    with pytest.raises(SystemExit):
        run_start(["--translator-mode", "mock", "--dry-run"])


def test_main_help_mentions_init_and_start_only(capsys) -> None:
    assert main(["help"]) == 0
    captured = capsys.readouterr()
    assert "User commands:" in captured.out
    assert "init" in captured.out
    assert "start" in captured.out
    assert "session-demo" not in captured.out


def test_main_help_dev_includes_development_commands(capsys) -> None:
    assert main(["help", "--dev"]) == 0
    captured = capsys.readouterr()
    assert "Development commands:" in captured.out
    assert "session-demo" in captured.out


def test_main_unknown_command_shows_help_and_returns_error(capsys) -> None:
    assert main(["unknown-command"]) == 1
    captured = capsys.readouterr()
    assert "Unknown command: unknown-command" in captured.out
    assert "User commands:" in captured.out
