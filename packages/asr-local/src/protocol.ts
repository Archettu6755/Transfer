import type { AudioInput, SourceLanguage } from 'shared';

export interface LocalASRConfig {
  baseUrl: string;
  timeoutMs?: number;
}

export type LocalASRTransport = 'http-file' | 'ws-stream';

export type LocalASRErrorCode =
  | 'not_implemented'
  | 'connection_failed'
  | 'timeout'
  | 'invalid_request'
  | 'runtime_unavailable'
  | 'runtime_error';

export interface LocalASRErrorPayload {
  code: LocalASRErrorCode;
  message: string;
  retryable: boolean;
}

export interface TranscribeFileRequest {
  requestId: string;
  audio: AudioInput;
  sourceLang: SourceLanguage;
  fileName?: string;
  mimeType?: string;
}

export interface TranscribeFileResponse {
  requestId: string;
  text: string;
  lang: SourceLanguage;
  latencyMs?: number;
}

export interface LocalASRSegment {
  id: string;
  text: string;
  startMs?: number;
  endMs?: number;
  isFinal: boolean;
}

export interface StartStreamRequest {
  type: 'start-stream';
  streamId: string;
  sourceLang: SourceLanguage;
  sampleRate: number;
}

export interface StreamAudioChunk {
  type: 'audio-chunk';
  streamId: string;
  chunkId: number;
  data: Float32Array;
  sampleRate: number;
}

export interface FinishStreamRequest {
  type: 'finish-stream';
  streamId: string;
}

export interface CancelStreamRequest {
  type: 'cancel-stream';
  streamId: string;
  reason?: string;
}

export type LocalASRStreamRequest =
  | StartStreamRequest
  | StreamAudioChunk
  | FinishStreamRequest
  | CancelStreamRequest;

export interface StreamStartedEvent {
  type: 'stream-started';
  streamId: string;
}

export interface PartialTranscriptEvent {
  type: 'partial-transcript';
  streamId: string;
  segment: LocalASRSegment;
}

export interface FinalTranscriptEvent {
  type: 'final-transcript';
  streamId: string;
  segment: LocalASRSegment;
}

export interface StreamCompletedEvent {
  type: 'stream-completed';
  streamId: string;
}

export interface StreamFailedEvent {
  type: 'stream-failed';
  streamId: string;
  error: LocalASRErrorPayload;
}

export type LocalASRStreamEvent =
  | StreamStartedEvent
  | PartialTranscriptEvent
  | FinalTranscriptEvent
  | StreamCompletedEvent
  | StreamFailedEvent;

export interface LocalASRRuntimeClient {
  init(config: LocalASRConfig): Promise<void>;
  transcribeFile(request: TranscribeFileRequest): Promise<TranscribeFileResponse>;
  openStream?(
    request: StartStreamRequest,
    onEvent: (event: LocalASRStreamEvent) => void
  ): Promise<void>;
  sendAudioChunk?(chunk: StreamAudioChunk): Promise<void>;
  finishStream?(request: FinishStreamRequest): Promise<void>;
  cancelStream?(request: CancelStreamRequest): Promise<void>;
  dispose(): Promise<void>;
}
