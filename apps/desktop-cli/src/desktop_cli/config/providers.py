"""Provider normalization and internal endpoint mapping."""

from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True, slots=True)
class ProviderDefinition:
    canonical_name: str
    aliases: tuple[str, ...]
    api_base_url: str
    api_key_env_var: str
    default_model_name: str
    flagship_model_hint: str


PROVIDER_DEFINITIONS: tuple[ProviderDefinition, ...] = (
    ProviderDefinition(
        canonical_name="zhipu",
        aliases=("zhipu", "glm"),
        api_base_url="https://open.bigmodel.cn/api/paas/v4",
        api_key_env_var="DESKTOP_CLI_ZHIPU_API_KEY",
        default_model_name="GLM-4.7-FlashX",
        flagship_model_hint="Latest GLM flagship listed in the Zhipu console",
    ),
    ProviderDefinition(
        canonical_name="deepseek",
        aliases=("deepseek",),
        api_base_url="https://api.deepseek.com",
        api_key_env_var="DESKTOP_CLI_DEEPSEEK_API_KEY",
        default_model_name="deepseek-v4-flash",
        flagship_model_hint="Latest DeepSeek flagship listed in the DeepSeek console",
    ),
    ProviderDefinition(
        canonical_name="qwen",
        aliases=("qwen", "tongyi"),
        api_base_url="https://dashscope.aliyuncs.com/compatible-mode/v1",
        api_key_env_var="DESKTOP_CLI_QWEN_API_KEY",
        default_model_name="qwen-turbo",
        flagship_model_hint="Latest Qwen flagship listed in the DashScope console",
    ),
    ProviderDefinition(
        canonical_name="kimi",
        aliases=("kimi", "moonshot"),
        api_base_url="https://api.moonshot.cn/v1",
        api_key_env_var="DESKTOP_CLI_KIMI_API_KEY",
        default_model_name="moonshot-v1-8k",
        flagship_model_hint="Latest Moonshot flagship listed in the Kimi console",
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
