import {
  DEFAULT_LOCAL_ASR_SESSION_STATE,
  DEFAULT_USER_SETTINGS,
  type LocalASRSessionState,
  type SourceLanguage,
  type TargetLanguage,
  type UserSettings
} from 'shared';

export type ExtensionStatus = 'idle' | 'running' | 'stopped';

export type LocalASRSessionAction =
  | { type: 'start-requested'; streamId: string; sourceLang: SourceLanguage }
  | { type: 'capture-started'; streamId: string }
  | { type: 'chunk-produced'; streamId: string; chunkId: number }
  | { type: 'stream-opened'; streamId: string }
  | { type: 'stop-requested'; streamId: string }
  | { type: 'stopped'; streamId: string }
  | { type: 'failed'; streamId: string; error: string };

export interface FakeSubtitlePayload {
  sourceLang: SourceLanguage;
  targetLang: TargetLanguage;
  sourceText: string;
  translatedText: string;
  showSourceText: boolean;
}

export type ExtensionRuntimeMessage =
  | { type: 'get-status' }
  | { type: 'start-preview' }
  | { type: 'stop-preview' };

export type ContentRuntimeMessage =
  | { type: 'show-fake-subtitle'; payload: FakeSubtitlePayload }
  | { type: 'hide-fake-subtitle' };

export type ExtensionMessage = ExtensionRuntimeMessage | ContentRuntimeMessage;

export type ExtensionRuntimeResponse =
  | {
      ok: true;
      status: ExtensionStatus;
      sourceLang?: SourceLanguage;
      targetLang?: TargetLanguage;
    }
  | { ok: false; error: string };

export interface MessageRouterDependencies {
  getSettings: () => Promise<UserSettings>;
  getActiveTabId: () => Promise<number | null>;
  sendMessageToTab: (tabId: number, message: ContentRuntimeMessage) => Promise<void>;
  startLocalCapture: (input: { tabId: number; sourceLang: SourceLanguage }) => Promise<void>;
  stopLocalCapture: () => Promise<void>;
  setStatus: (status: ExtensionStatus) => Promise<void>;
  getStatus: () => Promise<ExtensionStatus>;
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
        lastError: ''
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
    case 'stream-opened':
      return {
        ...currentState,
        status: 'streaming'
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
    const [settings, status] = await Promise.all([
      dependencies.getSettings(),
      dependencies.getStatus()
    ]);

    return {
      ok: true,
      status,
      sourceLang: settings.sourceLang,
      targetLang: settings.targetLang
    };
  }

  const tabId = await dependencies.getActiveTabId();

  if (tabId === null) {
    return {
      ok: false,
      error: 'No active tab is available for subtitle preview.'
    };
  }

  if (message.type === 'start-preview') {
    const settings = await dependencies.getSettings();
    await dependencies.startLocalCapture({
      tabId,
      sourceLang: settings.sourceLang
    });
    await dependencies.sendMessageToTab(tabId, {
      type: 'show-fake-subtitle',
      payload: buildFakeSubtitlePayload(settings)
    });
    await dependencies.setStatus('running');
    return { ok: true, status: 'running' };
  }

  await dependencies.stopLocalCapture();
  await dependencies.sendMessageToTab(tabId, { type: 'hide-fake-subtitle' });
  await dependencies.setStatus('stopped');
  return { ok: true, status: 'stopped' };
}

function buildFakeSubtitlePayload(settings: UserSettings): FakeSubtitlePayload {
  return {
    sourceLang: settings.sourceLang,
    targetLang: settings.targetLang,
    sourceText: getMockSourceText(settings.sourceLang),
    translatedText: getMockTranslatedText(settings.targetLang),
    showSourceText: settings.showSourceText
  };
}

function getMockSourceText(sourceLang: SourceLanguage): string {
  const textByLanguage: Record<SourceLanguage, string> = {
    zh: '大家好，今天我们来玩 Minecraft。',
    en: 'Hello everyone, today we are playing Minecraft.',
    ja: '今日はマイクラをやります。'
  };

  return textByLanguage[sourceLang] ?? getMockSourceText(DEFAULT_USER_SETTINGS.sourceLang);
}

function getMockTranslatedText(targetLang: TargetLanguage): string {
  const textByLanguage: Record<TargetLanguage, string> = {
    'zh-CN': '大家好，今天我们来玩 Minecraft。',
    en: 'Hello everyone, today we are playing Minecraft.'
  };

  return textByLanguage[targetLang] ?? textByLanguage[DEFAULT_USER_SETTINGS.targetLang];
}
