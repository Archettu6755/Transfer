import type { ASRProvider, ASRResult, AudioInput, SourceLanguage } from 'shared';
import {
  DEFAULT_BROWSER_ASR_MODEL,
  type BrowserASRLanguageHint,
  type BrowserASRModelConfig
} from './modelRegistry';

export interface BrowserASRTranscriptionRequest {
  audio: Float32Array;
  lang: SourceLanguage;
  sampleRate: number;
}

export interface BrowserASRRuntimeClient {
  init(config: BrowserASRModelConfig): Promise<void>;
  transcribe(request: BrowserASRTranscriptionRequest): Promise<{ text: string }>;
  dispose(): Promise<void>;
}

export interface BrowserASRProviderOptions {
  client?: BrowserASRRuntimeClient;
  modelConfig?: BrowserASRModelConfig;
}

type WorkerInitMessage = {
  type: 'init';
  modelId: string;
  languageHints: Record<SourceLanguage, BrowserASRLanguageHint>;
};

type WorkerRecognizeMessage = {
  type: 'recognize';
  audio: Float32Array;
  sampleRate: number;
  lang: SourceLanguage;
  languageHint: BrowserASRLanguageHint;
};

type WorkerDisposeMessage = {
  type: 'dispose';
};

type WorkerRequestMessage = WorkerInitMessage | WorkerRecognizeMessage | WorkerDisposeMessage;

type WorkerSuccessResponse =
  | { requestId: number; ok: true }
  | { requestId: number; ok: true; text: string };

type WorkerErrorResponse = {
  requestId: number;
  ok: false;
  error: string;
};

type WorkerResponseMessage = WorkerSuccessResponse | WorkerErrorResponse;

interface PendingRequest {
  resolve: (value: WorkerResponseMessage) => void;
  reject: (error: Error) => void;
}

export class BrowserASRProvider implements ASRProvider {
  private readonly client: BrowserASRRuntimeClient;
  private readonly modelConfig: BrowserASRModelConfig;
  private initialized = false;

  constructor(options: BrowserASRProviderOptions = {}) {
    this.client = options.client ?? new WorkerBrowserASRClient();
    this.modelConfig = options.modelConfig ?? DEFAULT_BROWSER_ASR_MODEL;
  }

  async init(): Promise<void> {
    if (this.initialized) {
      return;
    }

    await this.client.init(this.modelConfig);
    this.initialized = true;
  }

  async recognize(audio: AudioInput, lang: SourceLanguage): Promise<ASRResult> {
    const startedAt = Date.now();
    await this.init();

    const result = await this.client.transcribe({
      audio: audio.data,
      lang,
      sampleRate: audio.sampleRate
    });

    return {
      id: audio.id,
      text: result.text,
      lang,
      timestamp: Date.now(),
      latencyMs: Date.now() - startedAt
    };
  }

  async dispose(): Promise<void> {
    this.initialized = false;
    await this.client.dispose();
  }
}

class WorkerBrowserASRClient implements BrowserASRRuntimeClient {
  private worker: Worker | null = null;
  private nextRequestId = 0;
  private readonly pendingRequests = new Map<number, PendingRequest>();

  async init(config: BrowserASRModelConfig): Promise<void> {
    if (this.worker) {
      return;
    }

    if (typeof Worker === 'undefined') {
      throw new Error('Browser ASR requires Web Worker support in the current environment.');
    }

    this.worker = new Worker(new URL('./asr.worker.ts', import.meta.url), {
      type: 'module'
    });
    this.worker.addEventListener('message', this.handleMessage);
    this.worker.addEventListener('error', this.handleWorkerError);

    await this.postMessage({
      type: 'init',
      modelId: config.modelId,
      languageHints: config.languageHints
    });
  }

  async transcribe(request: BrowserASRTranscriptionRequest): Promise<{ text: string }> {
    const worker = this.getWorker();
    const response = await this.postMessage({
      type: 'recognize',
      audio: request.audio,
      sampleRate: request.sampleRate,
      lang: request.lang,
      languageHint: this.getLanguageHint(request.lang)
    });

    if (!('text' in response)) {
      throw new Error('Browser ASR worker returned an empty transcription response.');
    }

    // Keep worker referenced so TypeScript does not narrow it away before cleanup logic.
    void worker;
    return { text: response.text };
  }

  async dispose(): Promise<void> {
    if (!this.worker) {
      return;
    }

    try {
      await this.postMessage({ type: 'dispose' });
    } catch {
      // Ignore shutdown errors because the worker is being torn down anyway.
    }

    this.worker.removeEventListener('message', this.handleMessage);
    this.worker.removeEventListener('error', this.handleWorkerError);
    this.worker.terminate();
    this.worker = null;
    this.pendingRequests.clear();
  }

  private getLanguageHint(lang: SourceLanguage): BrowserASRLanguageHint {
    return DEFAULT_BROWSER_ASR_MODEL.languageHints[lang];
  }

  private getWorker(): Worker {
    if (!this.worker) {
      throw new Error('Browser ASR worker is not initialized.');
    }

    return this.worker;
  }

  private async postMessage(message: WorkerRequestMessage): Promise<WorkerResponseMessage> {
    const worker = this.getWorker();
    const requestId = this.nextRequestId++;

    return await new Promise<WorkerResponseMessage>((resolve, reject) => {
      this.pendingRequests.set(requestId, { resolve, reject });
      worker.postMessage({ requestId, ...message });
    });
  }

  private readonly handleMessage = (event: MessageEvent<WorkerResponseMessage>) => {
    const response = event.data;
    const pending = this.pendingRequests.get(response.requestId);

    if (!pending) {
      return;
    }

    this.pendingRequests.delete(response.requestId);

    if (!response.ok) {
      pending.reject(new Error(response.error));
      return;
    }

    pending.resolve(response);
  };

  private readonly handleWorkerError = (event: ErrorEvent) => {
    const error = new Error(event.message || 'Browser ASR worker crashed.');

    for (const pending of this.pendingRequests.values()) {
      pending.reject(error);
    }

    this.pendingRequests.clear();
  };
}
