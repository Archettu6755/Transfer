import { describe, expect, it } from 'vitest';
import { buildTranslationSystemPrompt, SOURCE_LANGUAGE_NAMES, TARGET_LANGUAGE_NAMES } from './prompt';

describe('prompt', () => {
  it('defines the supported language display names', () => {
    expect(SOURCE_LANGUAGE_NAMES).toEqual({
      zh: 'Mandarin Chinese',
      en: 'English',
      ja: 'Japanese'
    });

    expect(TARGET_LANGUAGE_NAMES).toEqual({
      'zh-CN': 'Simplified Chinese',
      en: 'English'
    });
  });

  it('builds the centralized translation system prompt', () => {
    expect(buildTranslationSystemPrompt('ja', 'zh-CN')).toContain(
      'Translate the following spoken content from Japanese to Simplified Chinese.'
    );
    expect(buildTranslationSystemPrompt('ja', 'zh-CN')).toContain(
      'Do not explain. Do not summarize. Output only the translated subtitle.'
    );
  });
});
