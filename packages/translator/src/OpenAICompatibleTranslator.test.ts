import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { OpenAICompatibleTranslator } from './OpenAICompatibleTranslator';

describe('OpenAICompatibleTranslator', () => {
  const fetchMock = vi.fn<typeof fetch>();

  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('calls the OpenAI-compatible chat completions endpoint and returns trimmed content', async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          choices: [{ message: { content: ' 大家好，今天我们来玩 Minecraft。 \n' } }]
        }),
        { status: 200 }
      )
    );

    const translator = new OpenAICompatibleTranslator({
      apiBaseUrl: 'https://api.example.com/v1',
      apiKey: 'test-key',
      modelName: 'test-model'
    });

    const result = await translator.translate('今日はマイクラをやります。', 'ja', 'zh-CN');

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0]?.[0]).toBe('https://api.example.com/v1/chat/completions');
    expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer test-key'
      }
    });

    expect(result).toMatchObject({
      sourceText: '今日はマイクラをやります。',
      translatedText: '大家好，今天我们来玩 Minecraft。',
      targetLang: 'zh-CN'
    });
  });

  it('throws a readable error when the network request fails', async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ error: { message: 'Bad API key' } }), {
        status: 401,
        statusText: 'Unauthorized'
      })
    );

    const translator = new OpenAICompatibleTranslator({
      apiBaseUrl: 'https://api.example.com/v1',
      apiKey: 'bad-key',
      modelName: 'test-model'
    });

    await expect(translator.translate('hello', 'en', 'zh-CN')).rejects.toThrow(
      'Translation request failed (401 Unauthorized): Bad API key'
    );
  });
});
