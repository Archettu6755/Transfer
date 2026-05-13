import './overlay.css';
import type { ContentRuntimeMessage } from '../background/messageRouter';
import { hideFakeSubtitle, showFakeSubtitle } from './overlay';

chrome.runtime.onMessage.addListener((message: unknown) => {
  if (!isContentRuntimeMessage(message)) {
    return false;
  }

  if (message.type === 'show-fake-subtitle') {
    showFakeSubtitle(message.payload);
    return false;
  }

  hideFakeSubtitle();
  return false;
});

function isContentRuntimeMessage(message: unknown): message is ContentRuntimeMessage {
  if (typeof message !== 'object' || message === null || !('type' in message)) {
    return false;
  }

  const type = (message as { type?: unknown }).type;
  return type === 'show-fake-subtitle' || type === 'hide-fake-subtitle';
}
