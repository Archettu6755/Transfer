import type { ASRProvider, ASRResult, AudioInput, SourceLanguage } from 'shared';
import type {
  CancelStreamRequest,
  FinishStreamRequest,
  LocalASRConfig,
  LocalASRRuntimeClient,
  LocalASRStreamEvent,
  StartStreamRequest,
  StreamAudioChunk,
  TranscribeFileResponse
} from './protocol';

const DEFAULT_LOCAL_ASR_CONFIG: LocalASRConfig = {
  baseUrl: 'http://127.0.0.1:8000',
  timeoutMs: 30_000
};

export interface LocalASRProviderOptions {
  client?: LocalASRRuntimeClient;
  config?: LocalASRConfig;
}

export interface LocalASRStreamSessionOptions {
  streamId: string;
  sourceLang: SourceLanguage;
  sampleRate: number;
  onEvent: (event: LocalASRStreamEvent) => void;
}

export class LocalASRProvider implements ASRProvider {
  private readonly client: LocalASRRuntimeClient;
  private readonly config: LocalASRConfig;
  private initialized = false;

  constructor(options: LocalASRProviderOptions = {}) {
    this.client = options.client ?? new UnimplementedLocalASRRuntimeClient();
    this.config = options.config ?? DEFAULT_LOCAL_ASR_CONFIG;
  }

  async init(): Promise<void> {
    if (this.initialized) {
      return;
    }

    await this.client.init(this.config);
    this.initialized = true;
  }

  async recognize(audio: AudioInput, lang: SourceLanguage): Promise<ASRResult> {
    await this.init();
    const response = await this.client.transcribeFile({
      requestId: createRequestId('file'),
      audio,
      sourceLang: lang
    });
    return toAsrResult(audio.id, response);
  }

  createStreamSession(options: LocalASRStreamSessionOptions): LocalASRStreamSession {
    return new LocalASRStreamSession(this.client, options);
  }

  async dispose(): Promise<void> {
    this.initialized = false;
    await this.client.dispose();
  }
}

class UnimplementedLocalASRRuntimeClient implements LocalASRRuntimeClient {
  async init(_config: LocalASRConfig): Promise<void> {
    throw new Error(
      'Local anime-whisper runtime scaffolding exists, but real runtime integration is not developed on this workstation.'
    );
  }

  async transcribeFile(_request: {
    requestId: string;
    audio: AudioInput;
    sourceLang: SourceLanguage;
  }): Promise<TranscribeFileResponse> {
    throw new Error(
      'Local anime-whisper runtime scaffolding exists, but file transcription is not implemented on this workstation.'
    );
  }

  async openStream(
    _request: StartStreamRequest,
    _onEvent: (event: LocalASRStreamEvent) => void
  ): Promise<void> {
    throw new Error(
      'Local anime-whisper runtime scaffolding exists, but stream startup is not implemented on this workstation.'
    );
  }

  async sendAudioChunk(_chunk: StreamAudioChunk): Promise<void> {
    throw new Error(
      'Local anime-whisper runtime scaffolding exists, but audio chunk streaming is not implemented on this workstation.'
    );
  }

  async finishStream(_request: FinishStreamRequest): Promise<void> {
    throw new Error(
      'Local anime-whisper runtime scaffolding exists, but stream completion is not implemented on this workstation.'
    );
  }

  async cancelStream(_request: CancelStreamRequest): Promise<void> {}

  async dispose(): Promise<void> {}
}

export class LocalASRStreamSession {
  private started = false;

  constructor(
    private readonly client: LocalASRRuntimeClient,
    private readonly options: LocalASRStreamSessionOptions
  ) {}

  async start(): Promise<void> {
    if (this.started) {
      return;
    }

    if (!this.client.openStream) {
      throw new Error('Local ASR runtime client does not expose stream startup.');
    }

    await this.client.openStream(
      {
        type: 'start-stream',
        streamId: this.options.streamId,
        sourceLang: this.options.sourceLang,
        sampleRate: this.options.sampleRate
      },
      this.options.onEvent
    );
    this.started = true;
  }

  async pushChunk(chunkId: number, data: Float32Array): Promise<void> {
    if (!this.client.sendAudioChunk) {
      throw new Error('Local ASR runtime client does not expose audio chunk streaming.');
    }

    await this.client.sendAudioChunk({
      type: 'audio-chunk',
      streamId: this.options.streamId,
      chunkId,
      data,
      sampleRate: this.options.sampleRate
    });
  }

  async finish(): Promise<void> {
    if (!this.client.finishStream) {
      throw new Error('Local ASR runtime client does not expose stream completion.');
    }

    await this.client.finishStream({
      type: 'finish-stream',
      streamId: this.options.streamId
    });
  }

  async cancel(reason?: string): Promise<void> {
    if (!this.client.cancelStream) {
      throw new Error('Local ASR runtime client does not expose stream cancellation.');
    }

    await this.client.cancelStream({
      type: 'cancel-stream',
      streamId: this.options.streamId,
      ...(reason === undefined ? {} : { reason })
    });
  }
}

function toAsrResult(id: string, response: TranscribeFileResponse): ASRResult {
  return {
    id,
    text: response.text,
    lang: response.lang,
    timestamp: Date.now(),
    ...(response.latencyMs === undefined ? {} : { latencyMs: response.latencyMs })
  };
}

function createRequestId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}
