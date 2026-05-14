import type { ASRProvider, ASRResult, AudioInput, SourceLanguage } from 'shared';

const MOCK_ASR_TEXT: Record<SourceLanguage, string> = {
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
