import { describe, expect, it, vi } from 'vitest';
import { LocalASRProvider } from './LocalASRProvider';
import { WebSocketASRClient } from './WebSocketASRClient';
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

  it('uses WebSocketASRClient by default', () => {
    const provider = new LocalASRProvider();
    expect(provider).toBeDefined();
  });
});

describe('WebSocketASRClient', () => {
  it('normalizes snake_case runtime events before invoking stream callbacks', async () => {
    const originalWebSocket = globalThis.WebSocket;
    const sentMessages: string[] = [];
    let socketInstance: FakeWebSocket | null = null;

    class FakeWebSocket {
      static OPEN = 1;
      readyState = FakeWebSocket.OPEN;
      onopen: (() => void) | null = null;
      onmessage: ((event: { data: string }) => void) | null = null;
      onerror: (() => void) | null = null;
      onclose: (() => void) | null = null;

      constructor(_url: string) {
        socketInstance = this;
        queueMicrotask(() => this.onopen?.());
      }

      send(message: string | ArrayBuffer): void {
        if (typeof message === 'string') {
          sentMessages.push(message);
        }
      }

      close(): void {
        this.onclose?.();
      }
    }

    vi.stubGlobal('WebSocket', FakeWebSocket);
    const client = new WebSocketASRClient();
    const onEvent = vi.fn();

    const started = client.openStream(
      {
        type: 'start-stream',
        streamId: 'stream-1',
        sourceLang: 'ja',
        sampleRate: 16_000
      },
      onEvent
    );

    await vi.waitFor(() => {
      expect(socketInstance).not.toBeNull();
    });
    const socket = socketInstance as unknown as FakeWebSocket;
    socket.onmessage?.({
      data: JSON.stringify({
        type: 'stream-started',
        stream_id: 'stream-1'
      })
    });

    await started;
    socket.onmessage?.({
      data: JSON.stringify({
        type: 'final-transcript',
        stream_id: 'stream-1',
        segment: {
          id: 'seg-1',
          text: '今日はマイクラをやります。',
          is_final: true,
          start_ms: 0,
          end_ms: 1200
        }
      })
    });
    socket.onmessage?.({
      data: JSON.stringify({
        type: 'stream-failed',
        stream_id: 'stream-1',
        message: 'runtime failed',
        retryable: false
      })
    });

    expect(sentMessages[0]).toContain('"stream_id":"stream-1"');
    expect(onEvent).toHaveBeenCalledWith({
      type: 'stream-started',
      streamId: 'stream-1'
    });
    expect(onEvent).toHaveBeenCalledWith({
      type: 'final-transcript',
      streamId: 'stream-1',
      segment: {
        id: 'seg-1',
        text: '今日はマイクラをやります。',
        isFinal: true,
        startMs: 0,
        endMs: 1200
      }
    });
    expect(onEvent).toHaveBeenCalledWith({
      type: 'stream-failed',
      streamId: 'stream-1',
      error: {
        code: 'runtime_error',
        message: 'runtime failed',
        retryable: false
      }
    });

    if (originalWebSocket === undefined) {
      vi.unstubAllGlobals();
    } else {
      vi.stubGlobal('WebSocket', originalWebSocket);
    }
  });
});
