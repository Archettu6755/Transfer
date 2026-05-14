"""Phase 2 translator client boundary."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Protocol


@dataclass(slots=True)
class TranslationRequest:
    """Minimal translator input for the fixed MVP direction."""

    source_text: str
    source_lang: str = "ja"
    target_lang: str = "zh-CN"


@dataclass(slots=True)
class TranslationResponse:
    """Minimal translator output for the fixed MVP direction."""

    source_text: str
    translated_text: str
    target_lang: str = "zh-CN"


class TranslatorClient(Protocol):
    """Future boundary for local product translation calls."""

    async def translate(self, request: TranslationRequest) -> TranslationResponse: ...
