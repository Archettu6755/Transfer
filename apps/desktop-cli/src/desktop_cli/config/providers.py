"""Provider normalization and internal endpoint mapping."""

from __future__ import annotations

from dataclasses import dataclass

from .models import get_default_model, get_flagship_model


@dataclass(frozen=True, slots=True)
class ProviderDefinition:
    canonical_name: str
    aliases: tuple[str, ...]
    api_base_url: str
    api_key_env_var: str
    default_model_name: str
    flagship_model_name: str


PROVIDER_DEFINITIONS: tuple[ProviderDefinition, ...] = (
    ProviderDefinition(
        canonical_name="zhipu",
        aliases=("zhipu", "glm"),
        api_base_url="https://open.bigmodel.cn/api/paas/v4",
        api_key_env_var="DESKTOP_CLI_ZHIPU_API_KEY",
        default_model_name=get_default_model("zhipu").model_name,
        flagship_model_name=get_flagship_model("zhipu").model_name,
    ),
    ProviderDefinition(
        canonical_name="deepseek",
        aliases=("deepseek",),
        api_base_url="https://api.deepseek.com",
        api_key_env_var="DESKTOP_CLI_DEEPSEEK_API_KEY",
        default_model_name=get_default_model("deepseek").model_name,
        flagship_model_name=get_flagship_model("deepseek").model_name,
    ),
    ProviderDefinition(
        canonical_name="qwen",
        aliases=("qwen", "tongyi"),
        api_base_url="https://dashscope.aliyuncs.com/compatible-mode/v1",
        api_key_env_var="DESKTOP_CLI_QWEN_API_KEY",
        default_model_name=get_default_model("qwen").model_name,
        flagship_model_name=get_flagship_model("qwen").model_name,
    ),
    ProviderDefinition(
        canonical_name="kimi",
        aliases=("kimi", "moonshot"),
        api_base_url="https://api.moonshot.cn/v1",
        api_key_env_var="DESKTOP_CLI_KIMI_API_KEY",
        default_model_name=get_default_model("kimi").model_name,
        flagship_model_name=get_flagship_model("kimi").model_name,
    ),
)


def resolve_provider(value: str) -> ProviderDefinition:
    normalized = value.strip().lower()
    if not normalized:
        raise RuntimeError("Provider name cannot be empty.")

    for definition in PROVIDER_DEFINITIONS:
        if normalized in definition.aliases:
            return definition

    supported = ", ".join(_format_provider_help(definition) for definition in PROVIDER_DEFINITIONS)
    raise RuntimeError(f"Unknown provider '{value}'. Supported providers: {supported}.")


def _format_provider_help(definition: ProviderDefinition) -> str:
    aliases = ", ".join(definition.aliases)
    return f"{definition.canonical_name} ({aliases})"
