// @vitest-environment jsdom
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Popup } from './Popup';

describe('Popup', () => {
  let container: HTMLDivElement | null = null;

  beforeEach(() => {
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  });

  afterEach(() => {
    container?.remove();
    container = null;
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('shows the runtime error returned in a successful status response', async () => {
    vi.stubGlobal('chrome', {
      runtime: {
        sendMessage: vi.fn(async () => ({
          ok: true,
          status: 'error',
          sourceLang: 'ja',
          targetLang: 'zh-CN',
          error: 'Translator failed.'
        }))
      }
    });

    container = document.createElement('div');
    document.body.appendChild(container);

    await act(async () => {
      createRoot(container!).render(<Popup />);
    });

    await act(async () => {
      await Promise.resolve();
    });

    expect(container?.textContent).toContain('Current status: error');
    expect(container?.textContent).toContain('Translator failed.');
  });
});
