from __future__ import annotations

import json
from pathlib import Path

from desktop_cli.cli.init import run_init


def _patch_app_root(monkeypatch, root: Path) -> None:
    monkeypatch.setattr("desktop_cli.config.storage.get_app_root", lambda: root)


def test_run_init_writes_saved_config_and_dotenv(tmp_path, monkeypatch) -> None:
    _patch_app_root(monkeypatch, tmp_path)

    answers = iter(
        [
            "glm",
            "",
            "",
            "",
            "",
            "",
        ]
    )

    monkeypatch.setattr("builtins.input", lambda _prompt="": next(answers))
    monkeypatch.setattr("getpass.getpass", lambda _prompt="": "secret-zhipu-key")

    assert run_init([]) == 0

    config_payload = json.loads((tmp_path / ".desktop-cli.json").read_text(encoding="utf-8"))
    dotenv_text = (tmp_path / ".env").read_text(encoding="utf-8")

    assert config_payload["provider"] == "zhipu"
    assert config_payload["model_name"] == "GLM-4.7-FlashX"
    assert config_payload["font_family"] == "Microsoft YaHei"
    assert config_payload["font_size"] == 32
    assert config_payload["background_opacity"] == 0.75
    assert config_payload["show_source_text"] is False
    assert "api_key" not in config_payload

    assert "DESKTOP_CLI_ZHIPU_API_KEY=secret-zhipu-key" in dotenv_text
