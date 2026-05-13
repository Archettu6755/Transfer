import { DEFAULT_USER_SETTINGS, type UserSettings } from 'shared';
import {
  routeExtensionMessage,
  type ExtensionRuntimeMessage,
  type ExtensionStatus
} from './messageRouter';

const SETTINGS_STORAGE_KEY = 'userSettings';
let currentStatus: ExtensionStatus = 'idle';

chrome.runtime.onInstalled.addListener(() => {
  void ensureStoredSettings();
});

chrome.runtime.onMessage.addListener((message: unknown, _sender, sendResponse) => {
  if (!isExtensionRuntimeMessage(message)) {
    return false;
  }

  void routeExtensionMessage(message, {
    getSettings: ensureStoredSettings,
    getActiveTabId,
    sendMessageToTab,
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

function isExtensionRuntimeMessage(message: unknown): message is ExtensionRuntimeMessage {
  if (typeof message !== 'object' || message === null || !('type' in message)) {
    return false;
  }

  const type = (message as { type?: unknown }).type;
  return type === 'get-status' || type === 'start-preview' || type === 'stop-preview';
}
