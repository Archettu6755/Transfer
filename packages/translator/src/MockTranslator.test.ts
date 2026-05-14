import { describe, expect, it } from 'vitest';
import { MockTranslator } from './MockTranslator';

describe('MockTranslator', () => {
  it('returns fixed text for the supported target language', async () => {
    const translator = new MockTranslator();

    await expect(translator.translate('ignored', 'ja', 'zh-CN')).resolves.toMatchObject({
      sourceText: 'ignored',
      translatedText: '大家好，今天我们来玩 Minecraft。',
      targetLang: 'zh-CN'
    });
  });
});
