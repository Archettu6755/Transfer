import { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import type { SourceLanguage, TargetLanguage } from 'shared';

type PopupStatus = 'idle' | 'running' | 'stopped' | 'error';

interface PopupState {
  status: PopupStatus;
  sourceLang: SourceLanguage;
  targetLang: TargetLanguage;
  error: string;
}

const DEFAULT_POPUP_STATE: PopupState = {
  status: 'idle',
  sourceLang: 'ja',
  targetLang: 'zh-CN',
  error: ''
};

export function Popup() {
  const [state, setState] = useState<PopupState>(DEFAULT_POPUP_STATE);

  useEffect(() => {
    void refreshStatus();
  }, []);

  async function refreshStatus(): Promise<void> {
    const response = await chrome.runtime.sendMessage({ type: 'get-status' });

    if (!response?.ok) {
      setState((currentState) => ({
        ...currentState,
        error: response?.error ?? 'Failed to load popup status.'
      }));
      return;
    }

    setState({
      status: response.status,
      sourceLang: response.sourceLang,
      targetLang: response.targetLang,
      error: response.error ?? ''
    });
  }

  async function handleAction(type: 'start-preview' | 'stop-preview'): Promise<void> {
    const response = await chrome.runtime.sendMessage({ type });

    if (!response?.ok) {
      setState((currentState) => ({
        ...currentState,
        error: response?.error ?? 'Popup action failed.'
      }));
      return;
    }

    await refreshStatus();
  }

  return (
    <main style={{ fontFamily: 'sans-serif', minWidth: 320, padding: 16 }}>
      <h1 style={{ fontSize: 18, margin: '0 0 12px' }}>Browser Live Translator</h1>
      <p style={{ margin: '0 0 8px' }}>Current status: {state.status}</p>
      <p style={{ margin: '0 0 16px' }}>
        Current direction: {state.sourceLang} -&gt; {state.targetLang}
      </p>
      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={() => void handleAction('start-preview')} type="button">
          Start
        </button>
        <button onClick={() => void handleAction('stop-preview')} type="button">
          Stop
        </button>
      </div>
      <p style={{ color: '#a00', minHeight: 20 }}>{state.error}</p>
    </main>
  );
}

const container = document.getElementById('root');

if (container) {
  createRoot(container).render(<Popup />);
}
