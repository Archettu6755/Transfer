import type { AudioInput } from './audio';
import type { SourceLanguage } from './language';

export interface ASRResult {
  id: string;
  text: string;
  lang: SourceLanguage;
  timestamp: number;
  latencyMs?: number;
}

export interface ASRProvider {
  init(): Promise<void>;
  recognize(audio: AudioInput, lang: SourceLanguage): Promise<ASRResult>;
  dispose(): Promise<void>;
}
