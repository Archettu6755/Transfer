import type { SubtitleSegment, TranslatorProvider, UserSettings } from 'shared';
import { DEFAULT_SUBTITLE_VISIBLE_MS, SubtitleStore } from 'subtitle';
import type { ContentRuntimeMessage } from './messageRouter';

export type TranscriptEvent =
  | { type: 'partial'; segmentId: string; text: string }
  | { type: 'final'; segmentId: string; text: string }
  | { type: 'completed' }
  | { type: 'failed'; error: string };

export interface TranscriptSessionCoordinatorDependencies {
  tabId: number;
  settings: UserSettings;
  translatorProvider: TranslatorProvider;
  subtitleStore: SubtitleStore;
  sendMessageToTab: (tabId: number, message: ContentRuntimeMessage) => Promise<void>;
  setLastError: (error: string) => void;
}

export class TranscriptSessionCoordinator {
  private hideTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(private readonly dependencies: TranscriptSessionCoordinatorDependencies) {}

  async handleEvent(event: TranscriptEvent): Promise<void> {
    if (event.type === 'partial') {
      return;
    }

    if (event.type === 'completed') {
      await this.hideAndClear();
      return;
    }

    if (event.type === 'failed') {
      this.dependencies.setLastError(event.error);
      await this.hideAndClear();
      return;
    }

    const { segment, errorMessage } = await this.translateSegment(event.segmentId, event.text);
    this.dependencies.subtitleStore.addSegment(segment);
    this.dependencies.setLastError(errorMessage ?? '');
    await this.dependencies.sendMessageToTab(this.dependencies.tabId, {
      type: 'show-latest-subtitle',
      payload: {
        segmentId: segment.id,
        sourceLang: segment.sourceLang,
        targetLang: segment.targetLang,
        sourceText: segment.source,
        translatedText: segment.translated,
        showSourceText: this.dependencies.settings.showSourceText,
        fontSize: this.dependencies.settings.fontSize,
        subtitlePosition: this.dependencies.settings.subtitlePosition,
        backgroundOpacity: this.dependencies.settings.backgroundOpacity,
        status: segment.status
      }
    });
    this.resetHideTimer();
  }

  async stop(): Promise<void> {
    await this.hideAndClear();
  }

  private async translateSegment(
    segmentId: string,
    text: string
  ): Promise<{ segment: SubtitleSegment; errorMessage?: string }> {
    const { settings, translatorProvider } = this.dependencies;

    try {
      const translation = await translatorProvider.translate(
        text,
        settings.sourceLang,
        settings.targetLang
      );

      return {
        segment: {
          id: segmentId,
          source: text,
          translated: translation.translatedText,
          sourceLang: settings.sourceLang,
          targetLang: settings.targetLang,
          createdAt: Date.now(),
          status: 'translated'
        }
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Translation request failed.';
      return {
        segment: {
          id: segmentId,
          source: text,
          translated: text,
          sourceLang: settings.sourceLang,
          targetLang: settings.targetLang,
          createdAt: Date.now(),
          status: 'error'
        },
        errorMessage: message
      };
    }
  }

  private resetHideTimer(): void {
    if (this.hideTimer !== null) {
      clearTimeout(this.hideTimer);
    }

    this.hideTimer = setTimeout(() => {
      void this.hideAndClear();
    }, DEFAULT_SUBTITLE_VISIBLE_MS);
  }

  private async hideAndClear(): Promise<void> {
    if (this.hideTimer !== null) {
      clearTimeout(this.hideTimer);
      this.hideTimer = null;
    }

    this.dependencies.subtitleStore.clear();
    await this.dependencies.sendMessageToTab(this.dependencies.tabId, {
      type: 'hide-subtitle'
    });
  }
}
