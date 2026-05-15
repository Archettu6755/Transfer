from __future__ import annotations

from desktop_cli.config.models import (
    get_default_model,
    get_flagship_model,
    get_provider_models,
)


def test_provider_model_table_contains_default_and_flagship_entries() -> None:
    zhipu_models = get_provider_models("zhipu")
    assert len(zhipu_models) == 2
    assert {model.tier for model in zhipu_models} == {"default", "flagship"}


def test_default_and_flagship_models_are_exposed_by_helper_functions() -> None:
    assert get_default_model("deepseek").model_name == "deepseek-v4-flash"
    assert get_flagship_model("qwen").model_name == "qwen-max"
