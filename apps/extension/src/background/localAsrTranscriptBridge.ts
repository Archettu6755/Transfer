import type { LocalASRStreamEvent } from 'asr-local';
import type { TranscriptEvent } from './transcriptCoordinator';

export interface LocalAsrTranscriptBridge {
  handleStreamEvent(event: LocalASRStreamEvent): Promise<void>;
  stop(): Promise<void>;
}

export interface LocalAsrTranscriptBridgeOptions {
  onTranscriptEvent: (event: TranscriptEvent) => Promise<void> | void;
}

export function createLocalAsrTranscriptBridge(
  options: LocalAsrTranscriptBridgeOptions
): LocalAsrTranscriptBridge {
  return {
    async handleStreamEvent(event: LocalASRStreamEvent): Promise<void> {
      if (event.type === 'partial-transcript') {
        await options.onTranscriptEvent({
          type: 'partial',
          segmentId: event.segment.id,
          text: event.segment.text
        });
        return;
      }

      if (event.type === 'final-transcript') {
        await options.onTranscriptEvent({
          type: 'final',
          segmentId: event.segment.id,
          text: event.segment.text
        });
        return;
      }

      if (event.type === 'stream-completed') {
        await options.onTranscriptEvent({ type: 'completed' });
        return;
      }

      if (event.type === 'stream-started') {
        return;
      }

      await options.onTranscriptEvent({
        type: 'failed',
        error: event.error.message
      });
    },
    async stop(): Promise<void> {}
  };
}
