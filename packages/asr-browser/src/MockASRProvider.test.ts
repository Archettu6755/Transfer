import { describe, expect, it } from 'vitest';
import { MockASRProvider } from './MockASRProvider';

describe('MockASRProvider', () => {
  it('returns fixed text for each supported source language', async () => {
    const provider = new MockASRProvider();
    await provider.init();

    await expect(
      provider.recognize({ id: '1', data: new Float32Array(), sampleRate: 16_000 }, 'en')
    ).resolves.toMatchObject({ text: 'Hello everyone, today we are playing Minecraft.', lang: 'en' });

    await expect(
      provider.recognize({ id: '2', data: new Float32Array(), sampleRate: 16_000 }, 'zh')
    ).resolves.toMatchObject({ text: '大家好，今天我们来玩 Minecraft。', lang: 'zh' });

    await expect(
      provider.recognize({ id: '3', data: new Float32Array(), sampleRate: 16_000 }, 'ja')
    ).resolves.toMatchObject({ text: '今日はマイクラをやります。', lang: 'ja' });
  });
});
