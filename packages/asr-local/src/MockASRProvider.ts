import type { ASRProvider, ASRResult, AudioInput, SourceLanguage } from 'shared';

const MOCK_ASR_TEXT: Record<SourceLanguage, string> = {
  ja: '今日はマイクラをやります。'
};

export class MockASRProvider implements ASRProvider {
  async init(): Promise<void> {}

  async recognize(audio: AudioInput, lang: SourceLanguage): Promise<ASRResult> {
    return {
      id: audio.id,
      text: MOCK_ASR_TEXT[lang],
      lang,
      timestamp: Date.now(),
      latencyMs: 0
    };
  }

  async dispose(): Promise<void> {}
}
