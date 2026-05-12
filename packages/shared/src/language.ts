export type SourceLanguage = 'zh' | 'en' | 'ja';
export type TargetLanguage = 'zh-CN' | 'en';

export const SOURCE_LANGUAGES = [
  { code: 'zh', label: 'Mandarin Chinese' },
  { code: 'en', label: 'English' },
  { code: 'ja', label: 'Japanese' }
] as const;

export const TARGET_LANGUAGES = [
  { code: 'zh-CN', label: 'Simplified Chinese' },
  { code: 'en', label: 'English' }
] as const;

export const DEFAULT_SOURCE_LANGUAGE: SourceLanguage = 'ja';
export const DEFAULT_TARGET_LANGUAGE: TargetLanguage = 'zh-CN';
