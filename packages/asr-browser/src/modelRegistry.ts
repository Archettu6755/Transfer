import type { SourceLanguage } from 'shared';

export type BrowserASRLanguageHint = 'chinese' | 'english' | 'japanese';

export interface BrowserASRModelConfig {
  modelId: string;
  languageHints: Record<SourceLanguage, BrowserASRLanguageHint>;
  targetSampleRate: number;
}

// Decision note:
// We use Transformers.js with a multilingual Whisper checkpoint because it runs
// fully in the browser, works in current Chrome, supports zh/en/ja, and does
// not require a local server. A tiny multilingual Whisper checkpoint is the
// smallest broadly available model family that still preserves the required
// language coverage for the MVP.
export const DEFAULT_BROWSER_ASR_MODEL: BrowserASRModelConfig = {
  modelId: 'Xenova/whisper-tiny',
  languageHints: {
    zh: 'chinese',
    en: 'english',
    ja: 'japanese'
  },
  targetSampleRate: 16_000
};
