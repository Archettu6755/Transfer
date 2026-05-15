"""Minimal provider-scoped model table for desktop-cli."""

from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True, slots=True)
class ModelDefinition:
    provider: str
    model_name: str
    tier: str
    description: str


MODEL_DEFINITIONS: tuple[ModelDefinition, ...] = (
    ModelDefinition(
        provider="zhipu",
        model_name="GLM-4.7-FlashX",
        tier="default",
        description="Recommended fast default model for desktop-cli.",
    ),
    ModelDefinition(
        provider="zhipu",
        model_name="GLM-4.7",
        tier="flagship",
        description="Current stronger GLM family model to consider first.",
    ),
    ModelDefinition(
        provider="deepseek",
        model_name="deepseek-v4-flash",
        tier="default",
        description="Recommended fast default model for desktop-cli.",
    ),
    ModelDefinition(
        provider="deepseek",
        model_name="deepseek-v4",
        tier="flagship",
        description="Current stronger DeepSeek family model to consider first.",
    ),
    ModelDefinition(
        provider="qwen",
        model_name="Qwen-MT-Flash",
        tier="default",
        description="Recommended fast default model for desktop-cli.",
    ),
    ModelDefinition(
        provider="qwen",
        model_name="Qwen-MT-Plus",
        tier="flagship",
        description="Current stronger Qwen family model to consider first.",
    ),
    ModelDefinition(
        provider="kimi",
        model_name="kimi-k2-0905-preview",
        tier="default",
        description="Recommended fast default model for desktop-cli.",
    ),
    ModelDefinition(
        provider="kimi",
        model_name="kimi-k2.5",
        tier="flagship",
        description="Current stronger Kimi family model to consider first.",
    ),
)


def get_provider_models(provider: str) -> tuple[ModelDefinition, ...]:
    return tuple(definition for definition in MODEL_DEFINITIONS if definition.provider == provider)


def get_default_model(provider: str) -> ModelDefinition:
    return _get_model_for_tier(provider, "default")


def get_flagship_model(provider: str) -> ModelDefinition:
    return _get_model_for_tier(provider, "flagship")


def _get_model_for_tier(provider: str, tier: str) -> ModelDefinition:
    for definition in MODEL_DEFINITIONS:
        if definition.provider == provider and definition.tier == tier:
            return definition
    raise RuntimeError(f"Missing {tier} model definition for provider '{provider}'.")
