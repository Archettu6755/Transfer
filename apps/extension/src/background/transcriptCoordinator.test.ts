import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { TranslationResult, TranslatorProvider } from 'shared';
import { SubtitleStore } from 'subtitle';
import {
  TranscriptSessionCoordinator,
} from './transcriptCoordinator';

describe('TranscriptSessionCoordinator', () => {
  const sendMessageToTab = vi.fn(async () => {});
  const setLastError = vi.fn();

  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  function createCoordinator(translatorProvider: TranslatorProvider) {
    const subtitleStore = new SubtitleStore();

    return {
      subtitleStore,
      coordinator: new TranscriptSessionCoordinator({
      tabId: 123,
      settings: {
        sourceLang: 'ja',
        targetLang: 'zh-CN',
        providerPreset: 'custom',
        apiBaseUrl: 'https://api.example.com/v1',
        apiKey: 'test-key',
        modelName: 'test-model',
        showSourceText: true,
        fontSize: 26,
        subtitlePosition: 'floating',
        backgroundOpacity: 0.55,
        debugEnabled: true,
        debugTranscriptSource: 'mock'
      },
      translatorProvider,
      subtitleStore,
      sendMessageToTab,
      setLastError
      })
    };
  }

  it('ignores partial transcript events for translation and overlay', async () => {
    const translatorProvider: TranslatorProvider = {
      translate: vi.fn(async () => {
        throw new Error('should not be called');
      })
    };
    const { coordinator, subtitleStore } = createCoordinator(translatorProvider);

    await coordinator.handleEvent({
      type: 'partial',
      segmentId: 'seg-1',
      text: 'partial text'
    });

    expect(translatorProvider.translate).not.toHaveBeenCalled();
    expect(sendMessageToTab).not.toHaveBeenCalled();
    expect(subtitleStore.getLatestSegment()).toBeNull();
  });

  it('translates final transcripts and publishes the latest subtitle payload', async () => {
    const translatorProvider: TranslatorProvider = {
      translate: vi.fn(async (text: string): Promise<TranslationResult> => ({
        sourceText: text,
        translatedText: '大家好，今天我们来玩 Minecraft。',
        targetLang: 'zh-CN',
        latencyMs: 20
      }))
    };
    const { coordinator, subtitleStore } = createCoordinator(translatorProvider);

    await coordinator.handleEvent({
      type: 'final',
      segmentId: 'seg-1',
      text: '今日はマイクラをやります。'
    });

    expect(sendMessageToTab).toHaveBeenCalledWith(123, {
      type: 'show-latest-subtitle',
      payload: {
        segmentId: 'seg-1',
        sourceLang: 'ja',
        targetLang: 'zh-CN',
        sourceText: '今日はマイクラをやります。',
        translatedText: '大家好，今天我们来玩 Minecraft。',
        showSourceText: true,
        fontSize: 26,
        subtitlePosition: 'floating',
        backgroundOpacity: 0.55,
        status: 'translated'
      }
    });
    expect(subtitleStore.getLatestSegment()).toMatchObject({
      id: 'seg-1',
      translated: '大家好，今天我们来玩 Minecraft。',
      status: 'translated'
    });
  });

  it('preserves source text and records an error when translation fails', async () => {
    const translatorProvider: TranslatorProvider = {
      translate: vi.fn(async () => {
        throw new Error('Translator failed.');
      })
    };
    const { coordinator, subtitleStore } = createCoordinator(translatorProvider);

    await coordinator.handleEvent({
      type: 'final',
      segmentId: 'seg-1',
      text: '今日はマイクラをやります。'
    });

    expect(setLastError).toHaveBeenCalledWith('Translator failed.');
    expect(sendMessageToTab).toHaveBeenCalledWith(123, {
      type: 'show-latest-subtitle',
      payload: expect.objectContaining({
        translatedText: '今日はマイクラをやります。',
        status: 'error'
      })
    });
    expect(subtitleStore.getLatestSegment()).toMatchObject({
      translated: '今日はマイクラをやります。',
      status: 'error'
    });
  });

  it('auto-hides subtitles after the default visible duration', async () => {
    const translatorProvider: TranslatorProvider = {
      translate: vi.fn(async (text: string): Promise<TranslationResult> => ({
        sourceText: text,
        translatedText: '大家好，今天我们来玩 Minecraft。',
        targetLang: 'zh-CN'
      }))
    };
    const { coordinator, subtitleStore } = createCoordinator(translatorProvider);

    await coordinator.handleEvent({
      type: 'final',
      segmentId: 'seg-1',
      text: '今日はマイクラをやります。'
    });
    await vi.advanceTimersByTimeAsync(6_000);

    expect(sendMessageToTab).toHaveBeenLastCalledWith(123, {
      type: 'hide-subtitle'
    });
    expect(subtitleStore.getRecentSegments()).toEqual([]);
  });

  it('cleans up the subtitle session on completed and stop', async () => {
    const translatorProvider: TranslatorProvider = {
      translate: vi.fn(async (text: string): Promise<TranslationResult> => ({
        sourceText: text,
        translatedText: '大家好，今天我们来玩 Minecraft。',
        targetLang: 'zh-CN'
      }))
    };
    const { coordinator, subtitleStore } = createCoordinator(translatorProvider);

    await coordinator.handleEvent({
      type: 'final',
      segmentId: 'seg-1',
      text: '今日はマイクラをやります。'
    });

    await coordinator.handleEvent({ type: 'completed' });

    expect(sendMessageToTab).toHaveBeenLastCalledWith(123, {
      type: 'hide-subtitle'
    });
    expect(subtitleStore.getRecentSegments()).toEqual([]);

    await coordinator.handleEvent({
      type: 'final',
      segmentId: 'seg-2',
      text: '大家好，今天我们来玩 Minecraft。'
    });
    await coordinator.stop();

    expect(sendMessageToTab).toHaveBeenLastCalledWith(123, {
      type: 'hide-subtitle'
    });
    expect(subtitleStore.getRecentSegments()).toEqual([]);
  });
});
