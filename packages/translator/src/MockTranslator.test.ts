import { describe, expect, it } from 'vitest';
import { MockTranslator } from './MockTranslator';

describe('MockTranslator', () => {
  it('returns fixed text for each supported target language', async () => {
    const translator = new MockTranslator();

    await expect(translator.translate('ignored', 'ja', 'zh-CN')).resolves.toMatchObject({
      sourceText: 'ignored',
      translatedText: '大家好，今天我们来玩 Minecraft。',
      targetLang: 'zh-CN'
    });

    await expect(translator.translate('ignored', 'zh', 'en')).resolves.toMatchObject({
      sourceText: 'ignored',
      translatedText: 'Hello everyone, today we are playing Minecraft.',
      targetLang: 'en'
    });
  });
});
