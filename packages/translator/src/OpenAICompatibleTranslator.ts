import type { SourceLanguage, TargetLanguage, TranslationResult, TranslatorProvider } from 'shared';
import { buildTranslationSystemPrompt } from './prompt';

export interface OpenAICompatibleConfig {
  apiBaseUrl: string;
  apiKey: string;
  modelName: string;
  timeoutMs?: number;
}

interface ChatCompletionsResponse {
  choices?: Array<{
    message?: {
      content?: string | null;
    };
  }>;
  error?: {
    message?: string;
  };
}

export class OpenAICompatibleTranslator implements TranslatorProvider {
  private readonly apiBaseUrl: string;
  private readonly apiKey: string;
  private readonly modelName: string;
  private readonly timeoutMs: number;

  constructor(config: OpenAICompatibleConfig) {
    this.apiBaseUrl = config.apiBaseUrl.trim();
    this.apiKey = config.apiKey.trim();
    this.modelName = config.modelName.trim();
    this.timeoutMs = config.timeoutMs ?? 15_000;
  }

  async translate(
    text: string,
    from: SourceLanguage,
    to: TargetLanguage
  ): Promise<TranslationResult> {
    if (!this.apiBaseUrl) {
      throw new Error('API Base URL is required.');
    }

    if (!this.apiKey) {
      throw new Error('API Key is required.');
    }

    if (!this.modelName) {
      throw new Error('Model Name is required.');
    }

    const startedAt = Date.now();
    const abortController = new AbortController();
    const timeoutHandle = setTimeout(() => {
      abortController.abort();
    }, this.timeoutMs);

    try {
      const response = await fetch(resolveChatCompletionsUrl(this.apiBaseUrl), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          model: this.modelName,
          messages: [
            {
              role: 'system',
              content: buildTranslationSystemPrompt(from, to)
            },
            {
              role: 'user',
              content: text
            }
          ],
          temperature: 0.2
        }),
        signal: abortController.signal
      });

      const payload = (await response.json()) as ChatCompletionsResponse;

      if (!response.ok) {
        const details = payload.error?.message?.trim();
        const suffix = details ? `: ${details}` : '';
        throw new Error(
          `Translation request failed (${response.status} ${response.statusText})${suffix}`
        );
      }

      const translatedText = payload.choices?.[0]?.message?.content?.trim();

      if (!translatedText) {
        throw new Error('Translation request failed: missing translated content.');
      }

      return {
        sourceText: text,
        translatedText,
        targetLang: to,
        latencyMs: Date.now() - startedAt
      };
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error(`Translation request timed out after ${this.timeoutMs}ms.`);
      }

      if (error instanceof Error) {
        throw error;
      }

      throw new Error('Translation request failed.');
    } finally {
      clearTimeout(timeoutHandle);
    }
  }
}

function resolveChatCompletionsUrl(apiBaseUrl: string): string {
  const normalizedBaseUrl = apiBaseUrl.replace(/\/+$/, '');

  if (normalizedBaseUrl.endsWith('/chat/completions')) {
    return normalizedBaseUrl;
  }

  return `${normalizedBaseUrl}/chat/completions`;
}
