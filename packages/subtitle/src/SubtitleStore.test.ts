import { describe, expect, it } from 'vitest';
import type { SubtitleSegment } from 'shared';
import { SubtitleStore } from './SubtitleStore';

function createSegment(id: string, translated: string): SubtitleSegment {
  return {
    id,
    source: `source-${id}`,
    translated,
    sourceLang: 'ja',
    targetLang: 'zh-CN',
    createdAt: Number(id),
    status: 'translated'
  };
}

describe('SubtitleStore', () => {
  it('stores segments and returns the latest segment', () => {
    const store = new SubtitleStore();
    store.addSegment(createSegment('1', 'first'));
    store.addSegment(createSegment('2', 'second'));

    expect(store.getLatestSegment()).toEqual(createSegment('2', 'second'));
  });

  it('returns recent segments in insertion order', () => {
    const store = new SubtitleStore();
    store.addSegment(createSegment('1', 'first'));
    store.addSegment(createSegment('2', 'second'));
    store.addSegment(createSegment('3', 'third'));

    expect(store.getRecentSegments()).toEqual([
      createSegment('1', 'first'),
      createSegment('2', 'second'),
      createSegment('3', 'third')
    ]);
    expect(store.getRecentSegments(2)).toEqual([
      createSegment('2', 'second'),
      createSegment('3', 'third')
    ]);
  });

  it('clears all stored segments', () => {
    const store = new SubtitleStore();
    store.addSegment(createSegment('1', 'first'));

    store.clear();

    expect(store.getLatestSegment()).toBeNull();
    expect(store.getRecentSegments()).toEqual([]);
  });
});
