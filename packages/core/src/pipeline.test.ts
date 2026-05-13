import { describe, expect, it } from 'vitest';
import { MockASRProvider } from 'asr-browser';
import { Pipeline } from './pipeline';
import type {
  SourceLanguage,
  TargetLanguage,
  TranslationResult,
  TranslatorProvider
} from 'shared';

class FailingTranslator implements TranslatorProvider {
  async translate(
    text: string,
    _from: SourceLanguage,
    _to: TargetLanguage
  ): Promise<TranslationResult> {
    throw new Error(`translation failed: ${text}`);
  }
}

describe('Pipeline', () => {
  it('produces a translated subtitle segment using injected providers', async () => {
    const { MockTranslator } = await import('translator');
    const pipeline = new Pipeline({
      asrProvider: new MockASRProvider(),
      translatorProvider: new MockTranslator()
    });

    const segment = await pipeline.process(
      { id: 'audio-1', data: new Float32Array(), sampleRate: 16_000 },
      {
        sourceLang: 'ja',
        targetLang: 'zh-CN',
        providerPreset: 'custom',
        apiBaseUrl: '',
        apiKey: '',
        modelName: '',
        showSourceText: false,
        fontSize: 24,
        subtitlePosition: 'bottom',
        backgroundOpacity: 0.65,
        debugEnabled: false
      }
    );

    expect(segment).toMatchObject({
      id: 'audio-1',
      source: '今日はマイクラをやります。',
      translated: '大家好，今天我们来玩 Minecraft。',
      sourceLang: 'ja',
      targetLang: 'zh-CN',
      status: 'translated'
    });
  });

  it('preserves source text when translation fails', async () => {
    const pipeline = new Pipeline({
      asrProvider: new MockASRProvider(),
      translatorProvider: new FailingTranslator()
    });

    const segment = await pipeline.process(
      { id: 'audio-2', data: new Float32Array(), sampleRate: 16_000 },
      {
        sourceLang: 'en',
        targetLang: 'en',
        providerPreset: 'custom',
        apiBaseUrl: '',
        apiKey: '',
        modelName: '',
        showSourceText: false,
        fontSize: 24,
        subtitlePosition: 'bottom',
        backgroundOpacity: 0.65,
        debugEnabled: false
      }
    );

    expect(segment).toMatchObject({
      source: 'Hello everyone, today we are playing Minecraft.',
      translated: 'Hello everyone, today we are playing Minecraft.',
      status: 'error'
    });
  });
});
