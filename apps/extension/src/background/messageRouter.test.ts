import { describe, expect, it, vi } from 'vitest';
import { DEFAULT_USER_SETTINGS } from 'shared';
import {
  type ExtensionStatus,
  routeExtensionMessage,
  type ExtensionRuntimeMessage,
  type MessageRouterDependencies
} from './messageRouter';

function createDependencies(): MessageRouterDependencies {
  return {
    getSettings: vi.fn(async () => DEFAULT_USER_SETTINGS),
    getActiveTabId: vi.fn(async () => 123),
    sendMessageToTab: vi.fn(async () => {}),
    setStatus: vi.fn(async () => {}),
    getStatus: vi.fn(async (): Promise<ExtensionStatus> => 'idle')
  };
}

describe('routeExtensionMessage', () => {
  it('returns the current popup status and language direction', async () => {
    const dependencies = createDependencies();

    const response = await routeExtensionMessage(
      { type: 'get-status' },
      dependencies
    );

    expect(response).toEqual({
      ok: true,
      status: 'idle',
      sourceLang: 'ja',
      targetLang: 'zh-CN'
    });
  });

  it('starts preview mode by routing a fake subtitle to the active tab', async () => {
    const dependencies = createDependencies();

    const response = await routeExtensionMessage(
      { type: 'start-preview' },
      dependencies
    );

    expect(response).toEqual({ ok: true, status: 'running' });
    expect(dependencies.setStatus).toHaveBeenCalledWith('running');
    expect(dependencies.sendMessageToTab).toHaveBeenCalledWith(123, {
      type: 'show-fake-subtitle',
      payload: {
        sourceLang: 'ja',
        targetLang: 'zh-CN',
        showSourceText: false,
        translatedText: '大家好，今天我们来玩 Minecraft。',
        sourceText: '今日はマイクラをやります。'
      }
    });
  });

  it('stops preview mode and clears the overlay', async () => {
    const dependencies = createDependencies();

    const response = await routeExtensionMessage(
      { type: 'stop-preview' },
      dependencies
    );

    expect(response).toEqual({ ok: true, status: 'stopped' });
    expect(dependencies.setStatus).toHaveBeenCalledWith('stopped');
    expect(dependencies.sendMessageToTab).toHaveBeenCalledWith(123, {
      type: 'hide-fake-subtitle'
    });
  });

  it('returns a readable error when no active tab is available', async () => {
    const dependencies = createDependencies();
    dependencies.getActiveTabId = vi.fn(async () => null);

    const response = await routeExtensionMessage(
      { type: 'start-preview' } satisfies ExtensionRuntimeMessage,
      dependencies
    );

    expect(response).toEqual({
      ok: false,
      error: 'No active tab is available for subtitle preview.'
    });
  });
});
