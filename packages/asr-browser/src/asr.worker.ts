import { env, pipeline } from '@huggingface/transformers';
import type { SourceLanguage } from 'shared';
import type { BrowserASRLanguageHint } from './modelRegistry';

type InitMessage = {
  requestId: number;
  type: 'init';
  modelId: string;
  languageHints: Record<SourceLanguage, BrowserASRLanguageHint>;
};

type RecognizeMessage = {
  requestId: number;
  type: 'recognize';
  audio: Float32Array;
  sampleRate: number;
  lang: SourceLanguage;
  languageHint: BrowserASRLanguageHint;
};

type DisposeMessage = {
  requestId: number;
  type: 'dispose';
};

type WorkerMessage = InitMessage | RecognizeMessage | DisposeMessage;

type SpeechRecognitionPipeline = (
  audio: Float32Array,
  options?: {
    language?: BrowserASRLanguageHint;
    return_timestamps?: boolean;
  }
) => Promise<{ text?: string }>;

type PipelineFactory = (
  task: 'automatic-speech-recognition',
  modelId: string
) => Promise<SpeechRecognitionPipeline>;

let transcriber: SpeechRecognitionPipeline | null = null;
let modelId = '';

env.allowLocalModels = false;

self.addEventListener('message', (event: MessageEvent<WorkerMessage>) => {
  void handleMessage(event.data);
});

async function handleMessage(message: WorkerMessage): Promise<void> {
  try {
    if (message.type === 'init') {
      modelId = message.modelId;
      const createPipeline = pipeline as unknown as PipelineFactory;
      transcriber = await createPipeline('automatic-speech-recognition', modelId);
      postSuccess(message.requestId);
      return;
    }

    if (message.type === 'recognize') {
      if (!transcriber) {
        throw new Error('Browser ASR model is not initialized.');
      }

      const output = await transcriber(message.audio, {
        language: message.languageHint,
        return_timestamps: false
      });

      const text = output.text?.trim();

      if (!text) {
        throw new Error(`Browser ASR produced empty text for ${message.lang}.`);
      }

      postSuccess(message.requestId, { text });
      return;
    }

    transcriber = null;
    modelId = '';
    postSuccess(message.requestId);
  } catch (error) {
    postError(message.requestId, error);
  }
}

function postSuccess(requestId: number, extra: Record<string, unknown> = {}): void {
  self.postMessage({
    requestId,
    ok: true,
    ...extra
  });
}

function postError(requestId: number, error: unknown): void {
  self.postMessage({
    requestId,
    ok: false,
    error: error instanceof Error ? error.message : 'Browser ASR worker failed.'
  });
}
