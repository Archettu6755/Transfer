import type { ASRProvider, ASRResult, AudioInput, SourceLanguage } from 'shared';

const MOCK_ASR_TEXT: Record<SourceLanguage, string> = {
  en: 'Hello everyone, today we are playing Minecraft.',
  zh: '大家好，今天我们来玩 Minecraft。',
  ja: '今日はマイクラをやります。'
};

export class MockASRProvider implements ASRProvider {
  async init(): Promise<void> {}

  async recognize(audio: AudioInput, lang: SourceLanguage): Promise<ASRResult> {
    const startedAt = Date.now();
    await new Promise<void>((resolve) => {
      setTimeout(resolve, 200);
    });

    return {
      id: audio.id,
      text: MOCK_ASR_TEXT[lang],
      lang,
      timestamp: Date.now(),
      latencyMs: Date.now() - startedAt
    };
  }

  async dispose(): Promise<void> {}
}
