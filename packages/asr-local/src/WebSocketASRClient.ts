import type {
  CancelStreamRequest,
  FinishStreamRequest,
  LocalASRConfig,
  LocalASRErrorCode,
  LocalASRSegment,
  LocalASRRuntimeClient,
  LocalASRStreamEvent,
  StartStreamRequest,
  StreamAudioChunk,
  TranscribeFileRequest,
  TranscribeFileResponse,
} from './protocol';

function float32ToPcm16(data: Float32Array): ArrayBuffer {
  const length = data.length;
  const buffer = new ArrayBuffer(length * 2);
  const view = new DataView(buffer);
  for (let i = 0; i < length; i++) {
    const sample = Math.max(-1, Math.min(1, data[i] ?? 0));
    const int16 = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
    view.setInt16(i * 2, int16, true);
  }
  return buffer;
}

interface RawRuntimeEvent {
  type?: string;
  stream_id?: string;
  streamId?: string;
  segment?: {
    id?: string;
    text?: string;
    is_final?: boolean;
    isFinal?: boolean;
    start_ms?: number;
    startMs?: number;
    end_ms?: number;
    endMs?: number;
  };
  message?: string;
  retryable?: boolean;
  error?: {
    code?: LocalASRErrorCode;
    message?: string;
    retryable?: boolean;
  };
}

function normalizeRuntimeEvent(raw: RawRuntimeEvent): LocalASRStreamEvent | null {
  const streamId = raw.streamId ?? raw.stream_id ?? '';

  if (raw.type === 'stream-started') {
    return { type: 'stream-started', streamId };
  }

  if (raw.type === 'stream-completed') {
    return { type: 'stream-completed', streamId };
  }

  if (raw.type === 'final-transcript' || raw.type === 'partial-transcript') {
    const segment = normalizeSegment(raw.segment);
    if (!segment) {
      return null;
    }
    return {
      type: raw.type,
      streamId,
      segment
    };
  }

  if (raw.type === 'stream-failed') {
    return {
      type: 'stream-failed',
      streamId,
      error: {
        code: raw.error?.code ?? 'runtime_error',
        message: raw.error?.message ?? raw.message ?? 'ASR stream failed.',
        retryable: raw.error?.retryable ?? raw.retryable ?? false
      }
    };
  }

  return null;
}

function normalizeSegment(raw: RawRuntimeEvent['segment']): LocalASRSegment | null {
  if (!raw) {
    return null;
  }

  const startMs = raw.startMs ?? raw.start_ms;
  const endMs = raw.endMs ?? raw.end_ms;

  return {
    id: raw.id ?? '',
    text: raw.text ?? '',
    isFinal: raw.isFinal ?? raw.is_final ?? false,
    ...(startMs === undefined ? {} : { startMs }),
    ...(endMs === undefined ? {} : { endMs })
  };
}

export class WebSocketASRClient implements LocalASRRuntimeClient {
  private ws: WebSocket | null = null;
  private baseUrl = 'ws://127.0.0.1:9000';
  private onEvent: ((event: LocalASRStreamEvent) => void) | null = null;

  async init(config: LocalASRConfig): Promise<void> {
    this.baseUrl = config.baseUrl || 'ws://127.0.0.1:9000';
  }

  async transcribeFile(
    request: TranscribeFileRequest
  ): Promise<TranscribeFileResponse> {
    return new Promise((resolve, reject) => {
      const ws = new WebSocket(this.baseUrl);
      let text = '';

      ws.onopen = () => {
        ws.send(
          JSON.stringify({
            type: 'start-stream',
            stream_id: request.requestId,
            source_lang: request.sourceLang,
            sample_rate: request.audio.sampleRate,
          })
        );
      };

      ws.onmessage = (event) => {
        if (typeof event.data !== 'string') return;
        const msg = JSON.parse(event.data) as RawRuntimeEvent;
        if (msg.type === 'stream-started' && request.audio.data.length > 0) {
          const pcm = float32ToPcm16(request.audio.data);
          ws.send(pcm);
          ws.send(
            JSON.stringify({
              type: 'finish-stream',
              stream_id: request.requestId,
            })
          );
        } else if (msg.type === 'final-transcript') {
          text = msg.segment?.text ?? '';
        } else if (msg.type === 'stream-completed') {
          ws.close();
          resolve({
            requestId: request.requestId,
            text,
            lang: request.sourceLang,
          });
        } else if (msg.type === 'stream-failed') {
          ws.close();
          reject(
            new Error(
              msg.error?.message || msg.message || 'ASR stream failed.'
            )
          );
        }
      };

      ws.onerror = () => {
        reject(
          new Error(
            `Could not connect to the anime-whisper ASR server at ${this.baseUrl}. ` +
              'Make sure the Docker container is running: docker compose up -d'
          )
        );
      };

      ws.onclose = () => {
        resolve({
          requestId: request.requestId,
          text,
          lang: request.sourceLang,
        });
      };
    });
  }

  async openStream(
    request: StartStreamRequest,
    onEvent: (event: LocalASRStreamEvent) => void
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const ws = new WebSocket(this.baseUrl);
      this.ws = ws;
      this.onEvent = onEvent;

      ws.onopen = () => {
        ws.send(
          JSON.stringify({
            type: 'start-stream',
            stream_id: request.streamId,
            source_lang: request.sourceLang,
            sample_rate: request.sampleRate,
          })
        );
      };

      ws.onmessage = (event) => {
        if (typeof event.data !== 'string') return;
        const msg = JSON.parse(event.data) as RawRuntimeEvent;
        const normalized = normalizeRuntimeEvent(msg);
        if (normalized) {
          onEvent(normalized);
        }

        if (msg.type === 'stream-started') {
          resolve();
        }
      };

      ws.onerror = () => {
        reject(
          new Error(
            `Could not connect to the anime-whisper ASR server at ${this.baseUrl}.`
          )
        );
      };

      ws.onclose = () => {
        this.ws = null;
      };
    });
  }

  async sendAudioChunk(chunk: StreamAudioChunk): Promise<void> {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error('WebSocket connection is not open.');
    }
    const pcm = float32ToPcm16(chunk.data);
    this.ws.send(pcm);
  }

  async finishStream(request: FinishStreamRequest): Promise<void> {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      return;
    }
    this.ws.send(
      JSON.stringify({
        type: 'finish-stream',
        stream_id: request.streamId,
      })
    );
    this.ws.close();
    this.ws = null;
  }

  async cancelStream(request: CancelStreamRequest): Promise<void> {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      return;
    }
    this.ws.send(
      JSON.stringify({
        type: 'cancel-stream',
        stream_id: request.streamId,
        reason: request.reason,
      })
    );
    this.ws.close();
    this.ws = null;
  }

  async dispose(): Promise<void> {
    this.ws?.close();
    this.ws = null;
    this.onEvent = null;
  }
}
