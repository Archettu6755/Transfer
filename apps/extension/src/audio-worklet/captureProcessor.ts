interface CaptureChunkMessage {
  chunkId: number;
  data: Float32Array;
  sampleRate: number;
}

declare const sampleRate: number;

declare abstract class AudioWorkletProcessor {
  readonly port: MessagePort;
  abstract process(inputs: Float32Array[][], outputs: Float32Array[][]): boolean;
}

declare function registerProcessor(
  name: string,
  processorCtor: new () => AudioWorkletProcessor
): void;

class CaptureProcessor extends AudioWorkletProcessor {
  private chunkId = 0;

  process(inputs: Float32Array[][], _outputs: Float32Array[][]): boolean {
    const inputChannels = inputs[0];

    if (!inputChannels || inputChannels.length === 0) {
      return true;
    }

    const frameLength = inputChannels[0]?.length ?? 0;

    if (frameLength === 0) {
      return true;
    }

    const monoChunk = new Float32Array(frameLength);

    for (let channelIndex = 0; channelIndex < inputChannels.length; channelIndex += 1) {
      const channelData = inputChannels[channelIndex];

      if (!channelData) {
        continue;
      }

      for (let sampleIndex = 0; sampleIndex < frameLength; sampleIndex += 1) {
        monoChunk[sampleIndex] =
          (monoChunk[sampleIndex] ?? 0) + (channelData[sampleIndex] ?? 0) / inputChannels.length;
      }
    }

    const message: CaptureChunkMessage = {
      chunkId: this.chunkId,
      data: monoChunk,
      sampleRate
    };

    this.port.postMessage(message);
    this.chunkId += 1;
    return true;
  }
}

registerProcessor('capture-processor', CaptureProcessor);
