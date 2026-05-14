export type SourceLanguage = 'ja';
export type TargetLanguage = 'zh-CN';

export const SOURCE_LANGUAGES = [
  { code: 'ja', label: 'Japanese' }
] as const;

export const TARGET_LANGUAGES = [
  { code: 'zh-CN', label: 'Simplified Chinese' }
] as const;

export const DEFAULT_SOURCE_LANGUAGE: SourceLanguage = 'ja';
export const DEFAULT_TARGET_LANGUAGE: TargetLanguage = 'zh-CN';
