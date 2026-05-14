import { DEFAULT_SUBTITLE_VISIBLE_MS } from 'subtitle';
import type { SourceLanguage } from 'shared';
import type { TranscriptEvent } from './transcriptCoordinator';

const MOCK_TRANSCRIPT_TEXT: Record<SourceLanguage, string> = {
  ja: '今日はマイクラをやります。'
};

export interface MockTranscriptSource {
  start(): Promise<void>;
  stop(): Promise<void>;
}

export interface MockTranscriptSourceOptions {
  sourceLang: SourceLanguage;
  onEvent: (event: TranscriptEvent) => void;
}

export function createMockTranscriptSource(
  options: MockTranscriptSourceOptions
): MockTranscriptSource {
  const timers = new Set<ReturnType<typeof setTimeout>>();
  const segmentId = `mock-${Date.now()}`;
  const text = MOCK_TRANSCRIPT_TEXT[options.sourceLang];

  function schedule(delayMs: number, event: TranscriptEvent): void {
    const timer = setTimeout(() => {
      timers.delete(timer);
      options.onEvent(event);
    }, delayMs);
    timers.add(timer);
  }

  return {
    async start(): Promise<void> {
      schedule(100, { type: 'partial', segmentId, text });
      schedule(300, { type: 'final', segmentId, text });
      schedule(DEFAULT_SUBTITLE_VISIBLE_MS + 350, { type: 'completed' });
    },
    async stop(): Promise<void> {
      for (const timer of timers) {
        clearTimeout(timer);
      }
      timers.clear();
    }
  };
}
