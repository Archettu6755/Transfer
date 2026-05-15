from __future__ import annotations

import pytest

from desktop_cli.config.providers import resolve_provider


def test_resolve_provider_normalizes_aliases() -> None:
    assert resolve_provider("glm").canonical_name == "zhipu"
    assert resolve_provider("zhipu").api_key_env_var == "DESKTOP_CLI_ZHIPU_API_KEY"
    assert resolve_provider("deepseek").api_base_url == "https://api.deepseek.com"
    assert resolve_provider("GLM").canonical_name == "zhipu"
    assert resolve_provider(" Tongyi ").canonical_name == "qwen"


def test_resolve_provider_reports_unknown_provider_readably() -> None:
    with pytest.raises(RuntimeError, match="Supported providers"):
        resolve_provider("unknown-provider")
