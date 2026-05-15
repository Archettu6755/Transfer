"""OpenAI-compatible translator client for the local desktop workflow."""

from __future__ import annotations

from dataclasses import dataclass, field

import httpx

from desktop_cli.config import AppConfig

from .client import TranslationRequest, TranslationResponse


def _build_messages(source_text: str) -> list[dict[str, str]]:
    return [
        {
            "role": "system",
            "content": (
                "You translate final Japanese VTuber livestream transcript text into "
                "Simplified Chinese subtitles. Output only the final zh-CN subtitle text."
            ),
        },
        {"role": "user", "content": source_text},
    ]


@dataclass(slots=True)
class OpenAICompatibleTranslatorClient:
    """Minimal real translator implementation for the fixed MVP direction."""

    config: AppConfig
    http_client: httpx.AsyncClient | None = None
    _owns_client: bool = field(default=False, init=False)

    async def translate(self, request: TranslationRequest) -> TranslationResponse:
        self._validate_config()
        client = self._ensure_client()
        url = f"{self.config.api_base_url.rstrip('/')}/chat/completions"
        payload = {
            "model": self.config.model_name,
            "messages": _build_messages(request.source_text),
            "temperature": 0,
        }
        headers = {
            "Authorization": f"Bearer {self.config.api_key}",
            "Content-Type": "application/json",
        }

        try:
            response = await client.post(url, json=payload, headers=headers)
            response.raise_for_status()
        except httpx.TimeoutException as exc:
            raise RuntimeError("OpenAI-compatible translation request timed out.") from exc
        except httpx.HTTPStatusError as exc:
            status_code = exc.response.status_code if exc.response is not None else "unknown"
            raise RuntimeError(
                f"OpenAI-compatible translation request failed with status {status_code}."
            ) from exc
        except httpx.HTTPError as exc:
            raise RuntimeError("OpenAI-compatible translation request failed.") from exc

        translated_text = self._extract_text(response.json())
        return TranslationResponse(
            source_text=request.source_text,
            translated_text=translated_text,
            target_lang="zh-CN",
        )

    async def aclose(self) -> None:
        client = self.http_client
        if client is None or not self._owns_client:
            return
        await client.aclose()
        self.http_client = None
        self._owns_client = False

    def _validate_config(self) -> None:
        if not self.config.api_base_url.strip():
            raise RuntimeError("Missing API Base URL for openai-compatible translation.")
        if not self.config.api_key.strip():
            raise RuntimeError("Missing API Key for openai-compatible translation.")
        if not self.config.model_name.strip():
            raise RuntimeError("Missing Model Name for openai-compatible translation.")

    def _ensure_client(self) -> httpx.AsyncClient:
        if self.http_client is not None:
            return self.http_client

        self.http_client = httpx.AsyncClient(
            timeout=self.config.translator_timeout_ms / 1000,
        )
        self._owns_client = True
        return self.http_client

    def _extract_text(self, payload: dict) -> str:
        choices = payload.get("choices")
        if not isinstance(choices, list) or not choices:
            raise RuntimeError("OpenAI-compatible translation response was empty.")

        message = choices[0].get("message")
        if not isinstance(message, dict):
            raise RuntimeError("OpenAI-compatible translation response was malformed.")

        content = message.get("content")
        if not isinstance(content, str) or not content.strip():
            raise RuntimeError("OpenAI-compatible translation response was empty.")

        return content.strip()
