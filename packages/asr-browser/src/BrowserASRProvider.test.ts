import { describe, expect, it, vi } from 'vitest';
import type { AudioInput, SourceLanguage } from 'shared';
import {
  BrowserASRProvider,
  type BrowserASRRuntimeClient,
  type BrowserASRTranscriptionRequest
} from './BrowserASRProvider';

class FakeBrowserASRClient implements BrowserASRRuntimeClient {
  public readonly init = vi.fn(async () => {});
  public readonly dispose = vi.fn(async () => {});
  public readonly transcribe = vi.fn(
    async ({ audio, lang, sampleRate }: BrowserASRTranscriptionRequest) => ({
      text: `recognized:${lang}:${sampleRate}:${audio.length}`
    })
  );
}

function createAudioInput(): AudioInput {
  return {
    id: 'browser-audio-1',
    data: new Float32Array([0, 0.5, -0.5, 1]),
    sampleRate: 16_000,
    durationMs: 250
  };
}

describe('BrowserASRProvider', () => {
  it('initializes the runtime client and passes source language to transcription', async () => {
    const client = new FakeBrowserASRClient();
    const provider = new BrowserASRProvider({ client });
    await provider.init();

    const result = await provider.recognize(createAudioInput(), 'ja');

    expect(client.init).toHaveBeenCalledOnce();
    expect(client.transcribe).toHaveBeenCalledWith({
      audio: createAudioInput().data,
      lang: 'ja',
      sampleRate: 16_000
    });
    expect(result).toMatchObject({
      id: 'browser-audio-1',
      text: 'recognized:ja:16000:4',
      lang: 'ja'
    });
    expect(result.latencyMs).toBeTypeOf('number');
  });

  it('disposes the runtime client', async () => {
    const client = new FakeBrowserASRClient();
    const provider = new BrowserASRProvider({ client });
    await provider.init();

    await provider.dispose();

    expect(client.dispose).toHaveBeenCalledOnce();
  });

  it('uses the configured source language values without introducing unsupported codes', async () => {
    const client = new FakeBrowserASRClient();
    const provider = new BrowserASRProvider({ client });
    await provider.init();

    for (const lang of ['zh', 'en', 'ja'] as const satisfies SourceLanguage[]) {
      await provider.recognize(createAudioInput(), lang);
    }

    expect(client.transcribe).toHaveBeenCalledTimes(3);
  });
});
