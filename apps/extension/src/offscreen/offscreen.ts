import type {
  OffscreenRuntimeEvent,
  OffscreenRuntimeMessage
} from '../local-asr/runtimeProtocol';

const WORKLET_MODULE_PATH = 'src/audio-worklet/captureProcessor.js';

interface ActiveCaptureSession {
  streamId: string;
  mediaStream: MediaStream;
  audioContext: AudioContext;
  sourceNode: MediaStreamAudioSourceNode;
  tapNode: GainNode;
  captureNode: AudioWorkletNode;
  silentSinkNode: GainNode;
}

interface CaptureChunkMessage {
  chunkId: number;
  data: Float32Array;
  sampleRate: number;
}

let activeSession: ActiveCaptureSession | null = null;

chrome.runtime.onMessage.addListener((message: unknown) => {
  if (!isOffscreenRuntimeMessage(message)) {
    return false;
  }

  void handleOffscreenRuntimeMessage(message);
  return false;
});

async function handleOffscreenRuntimeMessage(message: OffscreenRuntimeMessage): Promise<void> {
  try {
    if (message.type === 'start-local-asr-capture') {
      await startCapture(message);
      return;
    }

    if (message.type === 'finish-local-asr-capture') {
      await stopCapture(message.streamId, false);
      return;
    }

    if (message.type === 'cancel-local-asr-capture') {
      await stopCapture(message.streamId, true);
    }
  } catch (error) {
    await sendRuntimeEvent({
      type: 'local-asr-capture-failed',
      streamId: activeSession?.streamId ?? message.streamId,
      error: error instanceof Error ? error.message : 'Offscreen capture failed.'
    });
  }
}

async function startCapture(message: Extract<OffscreenRuntimeMessage, { type: 'start-local-asr-capture' }>): Promise<void> {
  if (activeSession) {
    await stopCapture(activeSession.streamId, true);
  }

  const mediaStream = await getCapturedTabMediaStream(message.mediaStreamId);
  const audioContext = new AudioContext({
    sampleRate: message.sampleRate
  });
  await audioContext.audioWorklet.addModule(chrome.runtime.getURL(WORKLET_MODULE_PATH));

  const sourceNode = audioContext.createMediaStreamSource(mediaStream);
  const tapNode = audioContext.createGain();
  const captureNode = new AudioWorkletNode(audioContext, 'capture-processor');
  const silentSinkNode = audioContext.createGain();
  silentSinkNode.gain.value = 0;

  captureNode.port.onmessage = (event: MessageEvent<CaptureChunkMessage>) => {
    const chunk = event.data;

    void chrome.runtime.sendMessage({
      type: 'local-asr-audio-chunk',
      streamId: message.streamId,
      chunkId: chunk.chunkId,
      data: chunk.data,
      sampleRate: chunk.sampleRate
    } satisfies OffscreenRuntimeMessage);
  };

  sourceNode.connect(audioContext.destination);
  sourceNode.connect(tapNode);
  tapNode.connect(captureNode);
  captureNode.connect(silentSinkNode);
  silentSinkNode.connect(audioContext.destination);

  activeSession = {
    streamId: message.streamId,
    mediaStream,
    audioContext,
    sourceNode,
    tapNode,
    captureNode,
    silentSinkNode
  };

  await sendRuntimeEvent({
    type: 'local-asr-capture-started',
    streamId: message.streamId
  });
}

async function stopCapture(streamId: string, cancelled: boolean): Promise<void> {
  if (!activeSession || activeSession.streamId !== streamId) {
    return;
  }

  const { mediaStream, audioContext, sourceNode, tapNode, captureNode, silentSinkNode } =
    activeSession;
  activeSession = null;

  captureNode.port.onmessage = null;
  sourceNode.disconnect();
  tapNode.disconnect();
  captureNode.disconnect();
  silentSinkNode.disconnect();
  mediaStream.getTracks().forEach((track) => track.stop());

  if (audioContext.state !== 'closed') {
    await audioContext.close();
  }

  await sendRuntimeEvent({
    type: cancelled ? 'local-asr-capture-finished' : 'local-asr-capture-finished',
    streamId
  });
}

async function getCapturedTabMediaStream(mediaStreamId: string): Promise<MediaStream> {
  const constraints = {
    audio: {
      mandatory: {
        chromeMediaSource: 'tab',
        chromeMediaSourceId: mediaStreamId
      }
    },
    video: false
  } as unknown as MediaStreamConstraints;

  return await navigator.mediaDevices.getUserMedia(constraints);
}

async function sendRuntimeEvent(event: OffscreenRuntimeEvent): Promise<void> {
  await chrome.runtime.sendMessage(event);
}

function isOffscreenRuntimeMessage(message: unknown): message is OffscreenRuntimeMessage {
  if (typeof message !== 'object' || message === null || !('type' in message)) {
    return false;
  }

  const type = (message as { type?: unknown }).type;
  return (
    type === 'start-local-asr-capture' ||
    type === 'finish-local-asr-capture' ||
    type === 'cancel-local-asr-capture'
  );
}
