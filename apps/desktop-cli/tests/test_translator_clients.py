from __future__ import annotations

import asyncio
import json

import httpx
import pytest

from desktop_cli.config import AppConfig
from desktop_cli.translator_client import (
    MockTranslatorClient,
    OpenAICompatibleTranslatorClient,
    TranslationRequest,
)


def test_mock_translator_client_returns_stable_zh_cn_text() -> None:
    client = MockTranslatorClient()

    response = asyncio.run(
        client.translate(TranslationRequest(source_text="これはテストです"))
    )

    assert response.target_lang == "zh-CN"
    assert response.translated_text == "模拟翻译：これはテストです"


@pytest.mark.parametrize(
    ("config", "expected_message"),
    [
        (AppConfig(model_name="gpt-4o-mini", api_key="k"), "API Base URL"),
        (AppConfig(api_base_url="https://example.com", model_name="gpt-4o-mini"), "API Key"),
        (AppConfig(api_base_url="https://example.com", api_key="k"), "Model Name"),
    ],
)
def test_openai_compatible_translator_client_reports_missing_config_readably(
    config: AppConfig,
    expected_message: str,
) -> None:
    client = OpenAICompatibleTranslatorClient(config=config)

    with pytest.raises(RuntimeError, match=expected_message):
        asyncio.run(client.translate(TranslationRequest(source_text="これはテストです")))


def test_openai_compatible_translator_client_sends_expected_request_shape() -> None:
    captured: dict[str, object] = {}

    def handler(request: httpx.Request) -> httpx.Response:
        captured["url"] = str(request.url)
        captured["auth"] = request.headers.get("Authorization")
        captured["payload"] = json.loads(request.content.decode("utf-8"))
        return httpx.Response(
            200,
            json={"choices": [{"message": {"content": "这是翻译结果"}}]},
        )

    client = OpenAICompatibleTranslatorClient(
        config=AppConfig(
            api_base_url="https://example.com/v1",
            api_key="secret-key",
            model_name="gpt-test",
        ),
        http_client=httpx.AsyncClient(transport=httpx.MockTransport(handler)),
    )

    response = asyncio.run(
        client.translate(TranslationRequest(source_text="これはテストです"))
    )
    asyncio.run(client.aclose())

    assert response.translated_text == "这是翻译结果"
    assert captured["url"] == "https://example.com/v1/chat/completions"
    assert captured["auth"] == "Bearer secret-key"
    payload = captured["payload"]
    assert payload["model"] == "gpt-test"
    assert payload["messages"][1]["content"] == "これはテストです"


def test_openai_compatible_translator_client_timeout_error_does_not_leak_api_key() -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        raise httpx.ReadTimeout("timed out", request=request)

    client = OpenAICompatibleTranslatorClient(
        config=AppConfig(
            api_base_url="https://example.com/v1",
            api_key="super-secret-key",
            model_name="gpt-test",
        ),
        http_client=httpx.AsyncClient(transport=httpx.MockTransport(handler)),
    )

    with pytest.raises(RuntimeError, match="timed out"):
        asyncio.run(client.translate(TranslationRequest(source_text="これはテストです")))
    asyncio.run(client.aclose())

    with pytest.raises(RuntimeError) as exc_info:
        asyncio.run(client.translate(TranslationRequest(source_text="これはテストです")))
    assert "super-secret-key" not in str(exc_info.value)
