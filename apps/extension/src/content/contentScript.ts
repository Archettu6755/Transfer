import './overlay.css';
import type { ContentRuntimeMessage } from '../background/messageRouter';
import { hideSubtitle, showLatestSubtitle } from './overlay';

chrome.runtime.onMessage.addListener((message: unknown) => {
  if (!isContentRuntimeMessage(message)) {
    return false;
  }

  if (message.type === 'show-latest-subtitle') {
    showLatestSubtitle(message.payload);
    return false;
  }

  hideSubtitle();
  return false;
});

function isContentRuntimeMessage(message: unknown): message is ContentRuntimeMessage {
  if (typeof message !== 'object' || message === null || !('type' in message)) {
    return false;
  }

  const type = (message as { type?: unknown }).type;
  return type === 'show-latest-subtitle' || type === 'hide-subtitle';
}
