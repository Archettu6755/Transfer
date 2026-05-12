import type { SourceLanguage, TargetLanguage } from './language';

export interface SubtitleSegment {
  id: string;
  source: string;
  translated: string;
  sourceLang: SourceLanguage;
  targetLang: TargetLanguage;
  createdAt: number;
  status: 'asr_done' | 'translating' | 'translated' | 'error';
}
