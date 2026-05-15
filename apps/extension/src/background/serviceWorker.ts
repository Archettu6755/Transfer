import {
  DEFAULT_USER_SETTINGS,
  type UserSettings
} from 'shared';
import {
  DEFAULT_LOCAL_ASR_SESSION_STATE,
  type LocalASRSessionState,
  type OffscreenRuntimeEvent,
  type OffscreenRuntimeMessage
} from '../local-asr/runtimeProtocol';
import {
  advanceLocalASRSessionState,
  type ContentRuntimeMessage,
  routeExtensionMessage,
  type ExtensionRuntimeMessage,
  type ExtensionStatus
} from './messageRouter';
import { SubtitleStore } from 'subtitle';
import { OpenAICompatibleTranslator } from 'translator';
import { createLocalAsrTranscriptBridge } from './localAsrTranscriptBridge';
import {
  createMockTranscriptSource,
  type MockTranscriptSource
} from './mockTranscriptSource';
import {
  TranscriptSessionCoordinator,
  type TranscriptEvent
} from './transcriptCoordinator';

const SETTINGS_STORAGE_KEY = 'userSettings';
const OFFSCREEN_DOCUMENT_PATH = 'src/offscreen/offscreen.html';
const CAPTURE_SAMPLE_RATE = 16_000;
let currentStatus: ExtensionStatus = 'idle';
let currentLastError = '';
let currentSessionTabId: number | null = null;
let currentLocalAsrSessionState: LocalASRSessionState = DEFAULT_LOCAL_ASR_SESSION_STATE;
let currentTranscriptCoordinator: TranscriptSessionCoordinator | null = null;
let currentMockTranscriptSource: MockTranscriptSource | null = null;
let currentLocalAsrTranscriptBridge:
  | ReturnType<typeof createLocalAsrTranscriptBridge>
  | null = null;

chrome.runtime.onInstalled.addListener(() => {
  void ensureStoredSettings();
});

chrome.runtime.onMessage.addListener((message: unknown, _sender, sendResponse) => {
  if (isOffscreenRuntimeEvent(message)) {
    handleOffscreenRuntimeEvent(message);
    return false;
  }

  if (isOffscreenRuntimeMessage(message)) {
    handleOffscreenChunkMessage(message);
    return false;
  }

  if (!isExtensionRuntimeMessage(message)) {
    return false;
  }

  void routeExtensionMessage(message, {
    getSettings: ensureStoredSettings,
    getActiveTabId,
    getSessionTabId: async () => currentSessionTabId,
    sendMessageToTab,
    startLocalCapture,
    stopLocalCapture,
    setStatus: async (status) => {
      currentStatus = status;
      if (status === 'running' || status === 'stopped') {
        currentLastError = '';
      }
    },
    getStatus: async () => currentStatus,
    getLastError: async () => currentLastError
  })
    .then((response) => {
      sendResponse(response);
    })
    .catch((error: unknown) => {
      const message =
        error instanceof Error ? error.message : 'Background routing failed.';
      currentStatus = 'error';
      currentLastError = message;
      sendResponse({ ok: false, error: message });
    });

  return true;
});

async function ensureStoredSettings(): Promise<UserSettings> {
  const stored = await chrome.storage.local.get(SETTINGS_STORAGE_KEY);
  const settings = (stored[SETTINGS_STORAGE_KEY] as Partial<UserSettings> | undefined) ?? {};
  const nextSettings: UserSettings = {
    ...DEFAULT_USER_SETTINGS,
    ...settings
  };

  if (stored[SETTINGS_STORAGE_KEY] === undefined) {
    await chrome.storage.local.set({ [SETTINGS_STORAGE_KEY]: nextSettings });
  }

  return nextSettings;
}

async function getActiveTabId(): Promise<number | null> {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  return tabs[0]?.id ?? null;
}

async function sendMessageToTab(
  tabId: number,
  message: ContentRuntimeMessage
): Promise<void> {
  await chrome.tabs.sendMessage(tabId, message);
}

async function startLocalCapture(input: {
  tabId: number;
  settings: UserSettings;
}): Promise<void> {
  currentSessionTabId = input.tabId;
  currentLastError = '';
  currentTranscriptCoordinator = new TranscriptSessionCoordinator({
    tabId: input.tabId,
    settings: input.settings,
    translatorProvider: new OpenAICompatibleTranslator({
      apiBaseUrl: input.settings.apiBaseUrl,
      apiKey: input.settings.apiKey,
      modelName: input.settings.modelName
    }),
    subtitleStore: new SubtitleStore(),
    sendMessageToTab,
    setLastError: (error) => {
      currentLastError = error;
    }
  });

  if (shouldUseMockTranscriptSource(input.settings)) {
    currentMockTranscriptSource = createMockTranscriptSource({
      sourceLang: input.settings.sourceLang,
      onEvent: (event) => {
        void handleTranscriptEvent(event);
      }
    });
    await currentMockTranscriptSource.start();
    return;
  }

  currentLocalAsrTranscriptBridge = createLocalAsrTranscriptBridge({
    onTranscriptEvent: (event) => {
      void handleTranscriptEvent(event);
    }
  });
  await ensureOffscreenDocument();

  const mediaStreamId = await chrome.tabCapture.getMediaStreamId({
    targetTabId: input.tabId
  });
  const streamId = createStreamId();

  currentLocalAsrSessionState = advanceLocalASRSessionState(DEFAULT_LOCAL_ASR_SESSION_STATE, {
    type: 'start-requested',
    streamId,
    sourceLang: input.settings.sourceLang
  });

  await chrome.runtime.sendMessage({
    type: 'start-local-asr-capture',
    streamId,
    mediaStreamId,
    sourceLang: input.settings.sourceLang,
    sampleRate: CAPTURE_SAMPLE_RATE
  } satisfies OffscreenRuntimeMessage);
}

async function stopLocalCapture(): Promise<void> {
  await currentMockTranscriptSource?.stop();
  currentMockTranscriptSource = null;
  currentLocalAsrTranscriptBridge = null;
  await currentTranscriptCoordinator?.stop();
  currentTranscriptCoordinator = null;

  const streamId = currentLocalAsrSessionState.streamId;

  if (streamId) {
    currentLocalAsrSessionState = advanceLocalASRSessionState(currentLocalAsrSessionState, {
      type: 'stop-requested',
      streamId
    });

    await chrome.runtime.sendMessage({
      type: 'cancel-local-asr-capture',
      streamId,
      reason: 'User stopped capture.'
    } satisfies OffscreenRuntimeMessage);

    currentSessionTabId = null;
    return;
  }

  currentSessionTabId = null;
  await closeOffscreenDocument();
}

function handleOffscreenRuntimeEvent(message: OffscreenRuntimeEvent): void {
  if (message.type === 'local-asr-capture-started') {
    currentLocalAsrSessionState = advanceLocalASRSessionState(currentLocalAsrSessionState, {
      type: 'capture-started',
      streamId: message.streamId
    });
    console.log('[extension] local ASR capture started', message.streamId);
    return;
  }

  if (message.type === 'local-asr-capture-finished') {
    currentLocalAsrSessionState = advanceLocalASRSessionState(currentLocalAsrSessionState, {
      type: 'stopped',
      streamId: message.streamId
    });
    void closeOffscreenDocument();
    console.log('[extension] local ASR capture finished', message.streamId);
    return;
  }

  if (message.type === 'local-asr-capture-failed') {
    currentLocalAsrSessionState = advanceLocalASRSessionState(currentLocalAsrSessionState, {
      type: 'failed',
      streamId: message.streamId,
      error: message.error
    });
    currentStatus = 'error';
    currentLastError = message.error;
    currentSessionTabId = null;
    void handleTranscriptEvent({ type: 'failed', error: message.error });
    void closeOffscreenDocument();
    console.error('[extension] local ASR capture failed', message.error);
    return;
  }

  currentLocalAsrSessionState = advanceLocalASRSessionState(currentLocalAsrSessionState, {
    type: 'chunk-produced',
    streamId: message.streamId,
    chunkId: message.chunkId
  });
  console.log(
    '[extension] local ASR chunk produced',
    message.streamId,
    `chunk=${message.chunkId}`,
    `sampleRate=${message.sampleRate}`
  );
}

function handleOffscreenChunkMessage(message: OffscreenRuntimeMessage): void {
  if (message.type !== 'local-asr-audio-chunk') {
    return;
  }

  currentLocalAsrSessionState = advanceLocalASRSessionState(currentLocalAsrSessionState, {
    type: 'chunk-produced',
    streamId: message.streamId,
    chunkId: message.chunkId
  });
  console.log(
    '[extension] local ASR chunk handed to client layer',
    message.streamId,
    `chunk=${message.chunkId}`,
    `sampleRate=${message.sampleRate}`,
    `frames=${message.data.length}`
  );
}

async function handleTranscriptEvent(event: TranscriptEvent): Promise<void> {
  if (!currentTranscriptCoordinator) {
    return;
  }

  await currentTranscriptCoordinator.handleEvent(event);

  if (event.type === 'completed') {
    currentStatus = 'stopped';
    currentSessionTabId = null;
    currentMockTranscriptSource = null;
    currentLocalAsrTranscriptBridge = null;
    currentTranscriptCoordinator = null;
  }

  if (event.type === 'failed') {
    currentStatus = 'error';
    currentSessionTabId = null;
    currentMockTranscriptSource = null;
    currentLocalAsrTranscriptBridge = null;
    currentTranscriptCoordinator = null;
  }
}

function isExtensionRuntimeMessage(message: unknown): message is ExtensionRuntimeMessage {
  if (typeof message !== 'object' || message === null || !('type' in message)) {
    return false;
  }

  const type = (message as { type?: unknown }).type;
  return type === 'get-status' || type === 'start-preview' || type === 'stop-preview';
}

function isOffscreenRuntimeMessage(message: unknown): message is OffscreenRuntimeMessage {
  if (typeof message !== 'object' || message === null || !('type' in message)) {
    return false;
  }

  const type = (message as { type?: unknown }).type;
  return (
    type === 'start-local-asr-capture' ||
    type === 'local-asr-audio-chunk' ||
    type === 'finish-local-asr-capture' ||
    type === 'cancel-local-asr-capture'
  );
}

function isOffscreenRuntimeEvent(message: unknown): message is OffscreenRuntimeEvent {
  if (typeof message !== 'object' || message === null || !('type' in message)) {
    return false;
  }

  const type = (message as { type?: unknown }).type;
  return (
    type === 'local-asr-capture-started' ||
    type === 'local-asr-chunk-produced' ||
    type === 'local-asr-capture-finished' ||
    type === 'local-asr-capture-failed'
  );
}

async function ensureOffscreenDocument(): Promise<void> {
  const offscreenUrl = chrome.runtime.getURL(OFFSCREEN_DOCUMENT_PATH);

  if ('getContexts' in chrome.runtime) {
    const contexts = await chrome.runtime.getContexts({
      contextTypes: ['OFFSCREEN_DOCUMENT'],
      documentUrls: [offscreenUrl]
    });

    if (contexts.length > 0) {
      return;
    }
  }

  await chrome.offscreen.createDocument({
    url: OFFSCREEN_DOCUMENT_PATH,
    reasons: [chrome.offscreen.Reason.USER_MEDIA],
    justification: 'Capture current tab audio in an offscreen document for subtitle processing.'
  });
}

async function closeOffscreenDocument(): Promise<void> {
  if ('getContexts' in chrome.runtime) {
    const contexts = await chrome.runtime.getContexts({
      contextTypes: ['OFFSCREEN_DOCUMENT'],
      documentUrls: [chrome.runtime.getURL(OFFSCREEN_DOCUMENT_PATH)]
    });

    if (contexts.length === 0) {
      return;
    }
  }

  await chrome.offscreen.closeDocument();
}

function createStreamId(): string {
  if ('randomUUID' in crypto) {
    return crypto.randomUUID();
  }

  return `stream-${Date.now()}`;
}

function shouldUseMockTranscriptSource(settings: UserSettings): boolean {
  return settings.debugEnabled && settings.debugTranscriptSource === 'mock';
}
