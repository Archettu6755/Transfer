import type { SourceLanguage } from 'shared';

export type LocalASRSessionStatus =
  | 'idle'
  | 'starting'
  | 'capturing'
  | 'streaming'
  | 'reconnecting'
  | 'stopping'
  | 'error';

export interface LocalASRSessionState {
  status: LocalASRSessionStatus;
  streamId: string | null;
  sourceLang: SourceLanguage | null;
  lastChunkId: number | null;
  lastPartialText: string;
  lastFinalText: string;
  lastError: string;
  reconnectAttempt: number;
}

export type OffscreenRuntimeMessage =
  | {
      type: 'start-local-asr-capture';
      streamId: string;
      mediaStreamId: string;
      sourceLang: SourceLanguage;
      sampleRate: number;
    }
  | {
      type: 'local-asr-audio-chunk';
      streamId: string;
      chunkId: number;
      data: Float32Array;
      sampleRate: number;
    }
  | {
      type: 'finish-local-asr-capture';
      streamId: string;
    }
  | {
      type: 'cancel-local-asr-capture';
      streamId: string;
      reason?: string;
    };

export type OffscreenRuntimeEvent =
  | {
      type: 'local-asr-capture-started';
      streamId: string;
    }
  | {
      type: 'local-asr-chunk-produced';
      streamId: string;
      chunkId: number;
      sampleRate: number;
    }
  | {
      type: 'local-asr-capture-finished';
      streamId: string;
    }
  | {
      type: 'local-asr-capture-failed';
      streamId: string;
      error: string;
    };

export const DEFAULT_LOCAL_ASR_SESSION_STATE: LocalASRSessionState = {
  status: 'idle',
  streamId: null,
  sourceLang: null,
  lastChunkId: null,
  lastPartialText: '',
  lastFinalText: '',
  lastError: '',
  reconnectAttempt: 0
};
