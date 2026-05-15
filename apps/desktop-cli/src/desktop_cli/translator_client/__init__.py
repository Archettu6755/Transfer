"""Translator client module boundary for OpenAI-compatible translation."""

from .client import TranslationRequest, TranslationResponse, TranslatorClient
from .mock import MockTranslatorClient
from .openai_compatible import OpenAICompatibleTranslatorClient

__all__ = [
    "MockTranslatorClient",
    "OpenAICompatibleTranslatorClient",
    "TranslationRequest",
    "TranslationResponse",
    "TranslatorClient",
]
