import type { LatestSubtitlePayload } from '../background/messageRouter';

const OVERLAY_ID = 'browser-live-translator-overlay';

export function showLatestSubtitle(payload: LatestSubtitlePayload): void {
  const overlay = ensureOverlay();
  overlay.dataset.visible = 'true';
  overlay.dataset.position = payload.subtitlePosition;
  overlay.innerHTML = '';
  overlay.style.fontSize = `${payload.fontSize}px`;
  overlay.style.backgroundColor = `rgba(0, 0, 0, ${payload.backgroundOpacity})`;

  if (payload.showSourceText) {
    const sourceLine = document.createElement('div');
    sourceLine.className = 'browser-live-translator-source';
    sourceLine.textContent = payload.sourceText;
    sourceLine.style.fontSize = `${Math.max(12, Math.round(payload.fontSize * 0.75))}px`;
    overlay.appendChild(sourceLine);
  }

  const translatedLine = document.createElement('div');
  translatedLine.className = 'browser-live-translator-translated';
  translatedLine.textContent = payload.translatedText;
  overlay.appendChild(translatedLine);
}

export function hideSubtitle(): void {
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
