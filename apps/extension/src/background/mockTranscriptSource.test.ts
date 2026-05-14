import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createMockTranscriptSource } from './mockTranscriptSource';

describe('createMockTranscriptSource', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it.each([
    ['ja', '今日はマイクラをやります。']
  ] as const)('emits a partial, final, and completed sequence for %s', async (sourceLang, text) => {
    const events: Array<{ type: string; text?: string }> = [];
    const source = createMockTranscriptSource({
      sourceLang,
      onEvent: (event) => {
        if ('text' in event) {
          events.push({
            type: event.type,
            text: event.text
          });
          return;
        }

        events.push({
          type: event.type
        });
      }
    });

    await source.start();
    await vi.runAllTimersAsync();

    expect(events).toEqual([
      { type: 'partial', text },
      { type: 'final', text },
      { type: 'completed' }
    ]);
  });
});
