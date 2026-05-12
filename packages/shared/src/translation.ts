import type { SourceLanguage, TargetLanguage } from './language';

export interface TranslationResult {
  sourceText: string;
  translatedText: string;
  targetLang: TargetLanguage;
  latencyMs?: number;
}

export interface TranslatorProvider {
  translate(
    text: string,
    from: SourceLanguage,
    to: TargetLanguage
  ): Promise<TranslationResult>;
}
