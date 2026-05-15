"""Mock translator client for local offline validation."""

from __future__ import annotations

from dataclasses import dataclass

from .client import TranslationRequest, TranslationResponse


@dataclass(slots=True)
class MockTranslatorClient:
    """Return stable zh-CN text without network access."""

    prefix: str = "模拟翻译："

    async def translate(self, request: TranslationRequest) -> TranslationResponse:
        return TranslationResponse(
            source_text=request.source_text,
            translated_text=f"{self.prefix}{request.source_text}",
            target_lang="zh-CN",
        )
