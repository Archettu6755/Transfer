import type { FakeSubtitlePayload } from '../background/messageRouter';

const OVERLAY_ID = 'browser-live-translator-overlay';

export function showFakeSubtitle(payload: FakeSubtitlePayload): void {
  const overlay = ensureOverlay();
  overlay.dataset.visible = 'true';
  overlay.innerHTML = '';

  if (payload.showSourceText) {
    const sourceLine = document.createElement('div');
    sourceLine.className = 'browser-live-translator-source';
    sourceLine.textContent = payload.sourceText;
    overlay.appendChild(sourceLine);
  }

  const translatedLine = document.createElement('div');
  translatedLine.className = 'browser-live-translator-translated';
  translatedLine.textContent = payload.translatedText;
  overlay.appendChild(translatedLine);
}

export function hideFakeSubtitle(): void {
  const overlay = document.getElementById(OVERLAY_ID);

  if (overlay) {
    overlay.remove();
  }
}

function ensureOverlay(): HTMLDivElement {
  const existing = document.getElementById(OVERLAY_ID);

  if (existing instanceof HTMLDivElement) {
    return existing;
  }

  const overlay = document.createElement('div');
  overlay.id = OVERLAY_ID;
  overlay.className = 'browser-live-translator-overlay';
  document.body.appendChild(overlay);
  return overlay;
}
