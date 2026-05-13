import {
  DEFAULT_LOCAL_ASR_SESSION_STATE,
  type LocalASRSessionState,
  DEFAULT_USER_SETTINGS,
  type OffscreenRuntimeEvent,
  type OffscreenRuntimeMessage,
  type SourceLanguage,
  type UserSettings
} from 'shared';
import {
  advanceLocalASRSessionState,
  routeExtensionMessage,
  type ExtensionRuntimeMessage,
  type ExtensionStatus
} from './messageRouter';

const SETTINGS_STORAGE_KEY = 'userSettings';
const OFFSCREEN_DOCUMENT_PATH = 'src/offscreen/offscreen.html';
const CAPTURE_SAMPLE_RATE = 16_000;
let currentStatus: ExtensionStatus = 'idle';
let currentLocalAsrSessionState: LocalASRSessionState = DEFAULT_LOCAL_ASR_SESSION_STATE;

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
    sendMessageToTab,
    startLocalCapture,
    stopLocalCapture,
    setStatus: async (status) => {
      currentStatus = status;
    },
    getStatus: async () => currentStatus
  })
    .then((response) => {
      sendResponse(response);
    })
    .catch((error: unknown) => {
      const message =
        error instanceof Error ? error.message : 'Background routing failed.';
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
  message: { type: 'show-fake-subtitle'; payload: unknown } | { type: 'hide-fake-subtitle' }
): Promise<void> {
  await chrome.tabs.sendMessage(tabId, message);
}

async function startLocalCapture(input: {
  tabId: number;
  sourceLang: SourceLanguage;
}): Promise<void> {
  await ensureOffscreenDocument();

  const mediaStreamId = await chrome.tabCapture.getMediaStreamId({
    targetTabId: input.tabId
  });
  const streamId = createStreamId();

  currentLocalAsrSessionState = advanceLocalASRSessionState(DEFAULT_LOCAL_ASR_SESSION_STATE, {
    type: 'start-requested',
    streamId,
    sourceLang: input.sourceLang
  });

  await chrome.runtime.sendMessage({
    type: 'start-local-asr-capture',
    streamId,
    mediaStreamId,
    sourceLang: input.sourceLang,
    sampleRate: CAPTURE_SAMPLE_RATE
  } satisfies OffscreenRuntimeMessage);
}

async function stopLocalCapture(): Promise<void> {
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

    return;
  }

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
    currentStatus = 'stopped';
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
