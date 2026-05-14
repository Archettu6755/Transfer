import type { SourceLanguage, TargetLanguage, TranslationResult, TranslatorProvider } from 'shared';

const MOCK_TRANSLATION_TEXT: Record<TargetLanguage, string> = {
  'zh-CN': '大家好，今天我们来玩 Minecraft。'
};

export class MockTranslator implements TranslatorProvider {
  async translate(
    text: string,
    _from: SourceLanguage,
    to: TargetLanguage
  ): Promise<TranslationResult> {
    return {
      sourceText: text,
      translatedText: MOCK_TRANSLATION_TEXT[to],
      targetLang: to,
      latencyMs: 0
    };
  }
}
