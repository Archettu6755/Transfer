import type { SourceLanguage, TargetLanguage } from 'shared';

export const SOURCE_LANGUAGE_NAMES: Record<SourceLanguage, string> = {
  zh: 'Mandarin Chinese',
  en: 'English',
  ja: 'Japanese'
};

export const TARGET_LANGUAGE_NAMES: Record<TargetLanguage, string> = {
  'zh-CN': 'Simplified Chinese',
  en: 'English'
};

export function buildTranslationSystemPrompt(
  sourceLanguage: SourceLanguage,
  targetLanguage: TargetLanguage
): string {
  return [
    'You are a professional live-stream subtitle translator.',
    `Translate the following spoken content from ${SOURCE_LANGUAGE_NAMES[sourceLanguage]} to ${TARGET_LANGUAGE_NAMES[targetLanguage]}.`,
    'Keep names, game titles, group names, and proper nouns unchanged when appropriate.',
    'Do not explain. Do not summarize. Output only the translated subtitle.'
  ].join(' ');
}
