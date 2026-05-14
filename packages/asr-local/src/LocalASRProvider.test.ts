import { describe, expect, it, vi } from 'vitest';
import { LocalASRProvider } from './LocalASRProvider';
import type {
  CancelStreamRequest,
  FinishStreamRequest,
  LocalASRConfig,
  LocalASRRuntimeClient,
  LocalASRStreamEvent,
  StartStreamRequest,
  StreamAudioChunk,
  TranscribeFileRequest,
  TranscribeFileResponse
} from './protocol';

function createFakeRuntimeClient(): LocalASRRuntimeClient {
  return {
    init: vi.fn(async (_config: LocalASRConfig) => {}),
    transcribeFile: vi.fn(
      async (request: TranscribeFileRequest): Promise<TranscribeFileResponse> => ({
        requestId: request.requestId,
        text: 'フェイクruntime clientの結果です。',
        lang: request.sourceLang,
        latencyMs: 12
      })
    ),
    openStream: vi.fn(
      async (
        _request: StartStreamRequest,
        _onEvent: (event: LocalASRStreamEvent) => void
      ): Promise<void> => {}
    ),
    sendAudioChunk: vi.fn(async (_chunk: StreamAudioChunk) => {}),
    finishStream: vi.fn(async (_request: FinishStreamRequest) => {}),
    cancelStream: vi.fn(async (_request: CancelStreamRequest) => {}),
    dispose: vi.fn(async () => {})
  };
}

describe('LocalASRProvider', () => {
  it('delegates recognize() to the runtime client and preserves sourceLang', async () => {
    const client = createFakeRuntimeClient();
    const provider = new LocalASRProvider({ client });

    const result = await provider.recognize(
      {
        id: 'audio-1',
        data: new Float32Array([0, 0.2, -0.2]),
        sampleRate: 16_000,
        durationMs: 500
      },
      'ja'
    );

    expect(client.init).toHaveBeenCalledTimes(1);
    expect(client.transcribeFile).toHaveBeenCalledTimes(1);
    expect(client.transcribeFile).toHaveBeenCalledWith(
      expect.objectContaining({
        audio: expect.objectContaining({ id: 'audio-1' }),
        sourceLang: 'ja'
      })
    );
    expect(result).toMatchObject({
      id: 'audio-1',
      text: 'フェイクruntime clientの結果です。',
      lang: 'ja',
      latencyMs: 12
    });
  });

  it('delegates stream session actions to the runtime client', async () => {
    const client = createFakeRuntimeClient();
    const provider = new LocalASRProvider({ client });
    const onEvent = vi.fn();
    const session = provider.createStreamSession({
      streamId: 'stream-1',
      sourceLang: 'ja',
      sampleRate: 16_000,
      onEvent
    });

    await session.start();
    await session.pushChunk(3, new Float32Array([0.1, -0.1]));
    await session.finish();
    await session.cancel('user-stop');

    expect(client.openStream).toHaveBeenCalledWith(
      {
        type: 'start-stream',
        streamId: 'stream-1',
        sourceLang: 'ja',
        sampleRate: 16_000
      },
      onEvent
    );
    expect(client.sendAudioChunk).toHaveBeenCalledWith({
      type: 'audio-chunk',
      streamId: 'stream-1',
      chunkId: 3,
      data: expect.any(Float32Array),
      sampleRate: 16_000
    });
    expect(client.finishStream).toHaveBeenCalledWith({
      type: 'finish-stream',
      streamId: 'stream-1'
    });
    expect(client.cancelStream).toHaveBeenCalledWith({
      type: 'cancel-stream',
      streamId: 'stream-1',
      reason: 'user-stop'
    });
  });

  it('surfaces readable unimplemented runtime errors', async () => {
    const provider = new LocalASRProvider();

    await expect(
      provider.recognize(
        {
          id: 'audio-2',
          data: new Float32Array(),
          sampleRate: 16_000
        },
        'ja'
      )
    ).rejects.toThrow(
      'Local anime-whisper runtime scaffolding exists, but real runtime integration is not developed on this workstation.'
    );
  });
});
