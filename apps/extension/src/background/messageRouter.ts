import {
  DEFAULT_LOCAL_ASR_SESSION_STATE,
  type LocalASRSessionState,
  type SourceLanguage,
  type SubtitleSegment,
  type UserSettings
} from 'shared';

export type ExtensionStatus = 'idle' | 'running' | 'stopped' | 'error';

export type LocalASRSessionAction =
  | { type: 'start-requested'; streamId: string; sourceLang: SourceLanguage }
  | { type: 'capture-started'; streamId: string }
  | { type: 'chunk-produced'; streamId: string; chunkId: number }
  | { type: 'partial-transcript'; streamId: string; text: string }
  | { type: 'final-transcript'; streamId: string; text: string }
  | { type: 'stream-opened'; streamId: string }
  | { type: 'reconnect-attempted'; streamId: string; attempt: number }
  | { type: 'stop-requested'; streamId: string }
  | { type: 'stopped'; streamId: string }
  | { type: 'failed'; streamId: string; error: string };

export interface LatestSubtitlePayload {
  segmentId: string;
  sourceLang: SubtitleSegment['sourceLang'];
  targetLang: SubtitleSegment['targetLang'];
  sourceText: string;
  translatedText: string;
  showSourceText: boolean;
  fontSize: number;
  subtitlePosition: UserSettings['subtitlePosition'];
  backgroundOpacity: number;
  status: SubtitleSegment['status'];
}

export type ExtensionRuntimeMessage =
  | { type: 'get-status' }
  | { type: 'start-preview' }
  | { type: 'stop-preview' };

export type ContentRuntimeMessage =
  | { type: 'show-latest-subtitle'; payload: LatestSubtitlePayload }
  | { type: 'hide-subtitle' };

export type ExtensionMessage = ExtensionRuntimeMessage | ContentRuntimeMessage;

export type ExtensionRuntimeResponse =
  | {
      ok: true;
      status: ExtensionStatus;
      sourceLang?: SourceLanguage;
      targetLang?: SubtitleSegment['targetLang'];
      error?: string;
    }
  | { ok: false; error: string };

export interface MessageRouterDependencies {
  getSettings: () => Promise<UserSettings>;
  getActiveTabId: () => Promise<number | null>;
  getSessionTabId: () => Promise<number | null>;
  sendMessageToTab: (tabId: number, message: ContentRuntimeMessage) => Promise<void>;
  startLocalCapture: (input: { tabId: number; settings: UserSettings }) => Promise<void>;
  stopLocalCapture: () => Promise<void>;
  setStatus: (status: ExtensionStatus) => Promise<void>;
  getStatus: () => Promise<ExtensionStatus>;
  getLastError: () => Promise<string>;
}

export function advanceLocalASRSessionState(
  currentState: LocalASRSessionState,
  action: LocalASRSessionAction
): LocalASRSessionState {
  if (
    currentState.streamId !== null &&
    action.type !== 'start-requested' &&
    action.streamId !== currentState.streamId
  ) {
    return currentState;
  }

  switch (action.type) {
    case 'start-requested':
      return {
        status: 'starting',
        streamId: action.streamId,
        sourceLang: action.sourceLang,
        lastChunkId: null,
        lastPartialText: '',
        lastFinalText: '',
        lastError: '',
        reconnectAttempt: 0
      };
    case 'capture-started':
      return {
        ...currentState,
        status: 'capturing'
      };
    case 'chunk-produced':
      return {
        ...currentState,
        status: 'streaming',
        lastChunkId: action.chunkId
      };
    case 'partial-transcript':
      return {
        ...currentState,
        status: 'streaming',
        lastPartialText: action.text
      };
    case 'final-transcript':
      return {
        ...currentState,
        status: 'streaming',
        lastFinalText: action.text,
        lastPartialText: ''
      };
    case 'stream-opened':
      return {
        ...currentState,
        status: 'streaming'
      };
    case 'reconnect-attempted':
      return {
        ...currentState,
        status: 'reconnecting',
        reconnectAttempt: action.attempt
      };
    case 'stop-requested':
      return {
        ...currentState,
        status: 'stopping'
      };
    case 'stopped':
      return DEFAULT_LOCAL_ASR_SESSION_STATE;
    case 'failed':
      return {
        ...currentState,
        status: 'error',
        lastError: action.error
      };
  }
}

export async function routeExtensionMessage(
  message: ExtensionRuntimeMessage,
  dependencies: MessageRouterDependencies
): Promise<ExtensionRuntimeResponse> {
  if (message.type === 'get-status') {
    const [settings, status, error] = await Promise.all([
      dependencies.getSettings(),
      dependencies.getStatus(),
      dependencies.getLastError()
    ]);

    return {
      ok: true,
      status,
      sourceLang: settings.sourceLang,
      targetLang: settings.targetLang,
      ...(error ? { error } : {})
    };
  }

  const currentStatus = await dependencies.getStatus();

  if (message.type === 'start-preview' && currentStatus === 'running') {
    return {
      ok: false,
      error: 'Translation is already running for the current session.'
    };
  }

  if (message.type === 'start-preview') {
    const tabId = await dependencies.getActiveTabId();

    if (tabId === null) {
      return {
        ok: false,
        error: 'No active tab is available for subtitle preview.'
      };
    }

    const settings = await dependencies.getSettings();
    await dependencies.startLocalCapture({
      tabId,
      settings
    });
    await dependencies.setStatus('running');
    return { ok: true, status: 'running' };
  }

  const sessionTabId = await dependencies.getSessionTabId();
  await dependencies.stopLocalCapture();
  if (sessionTabId !== null) {
    await dependencies.sendMessageToTab(sessionTabId, { type: 'hide-subtitle' });
  }
  await dependencies.setStatus('stopped');
  return { ok: true, status: 'stopped' };
}
