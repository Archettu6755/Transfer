import type { AudioInput } from 'shared';

const DEFAULT_TARGET_SAMPLE_RATE = 16_000;

export interface AudioDecodeOptions {
  targetSampleRate?: number;
  audioContextFactory?: () => AudioContext;
}

export async function createAudioInputFromFile(
  file: File,
  options: AudioDecodeOptions = {}
): Promise<AudioInput> {
  const audioContext = (options.audioContextFactory ?? createBrowserAudioContext)();

  try {
    const fileBuffer = await file.arrayBuffer();
    const decodedBuffer = await audioContext.decodeAudioData(fileBuffer.slice(0));
    const monoData = mixToMono(decodedBuffer);
    const targetSampleRate = options.targetSampleRate ?? DEFAULT_TARGET_SAMPLE_RATE;
    const outputData =
      decodedBuffer.sampleRate === targetSampleRate
        ? monoData
        : resampleLinear(monoData, decodedBuffer.sampleRate, targetSampleRate);

    return {
      id: file.name || 'uploaded-audio',
      data: outputData,
      sampleRate: targetSampleRate,
      durationMs: Math.round(decodedBuffer.duration * 1000)
    };
  } catch (error) {
    throw new Error(
      error instanceof Error
        ? `Failed to decode uploaded audio: ${error.message}`
        : 'Failed to decode uploaded audio.'
    );
  } finally {
    await closeAudioContext(audioContext);
  }
}

export function mixToMono(audioBuffer: AudioBuffer): Float32Array {
  if (audioBuffer.numberOfChannels === 0) {
    return new Float32Array();
  }

  if (audioBuffer.numberOfChannels === 1) {
    return audioBuffer.getChannelData(0).slice();
  }

  const channelCount = audioBuffer.numberOfChannels;
  const mono = new Float32Array(audioBuffer.length);

  for (let channelIndex = 0; channelIndex < channelCount; channelIndex += 1) {
    const channelData = audioBuffer.getChannelData(channelIndex);

    for (let sampleIndex = 0; sampleIndex < channelData.length; sampleIndex += 1) {
      const sampleValue = channelData[sampleIndex] ?? 0;
      mono[sampleIndex] = (mono[sampleIndex] ?? 0) + sampleValue / channelCount;
    }
  }

  return mono;
}

export function resampleLinear(
  source: Float32Array,
  inputSampleRate: number,
  targetSampleRate: number
): Float32Array {
  if (inputSampleRate === targetSampleRate) {
    return source.slice();
  }

  if (source.length === 0) {
    return new Float32Array();
  }

  const outputLength = Math.max(1, Math.round((source.length * targetSampleRate) / inputSampleRate));
  const output = new Float32Array(outputLength);
  const sampleRatio = inputSampleRate / targetSampleRate;

  for (let outputIndex = 0; outputIndex < outputLength; outputIndex += 1) {
    const sourcePosition = outputIndex * sampleRatio;
    const leftIndex = Math.floor(sourcePosition);
    const rightIndex = Math.min(leftIndex + 1, source.length - 1);
    const interpolation = sourcePosition - leftIndex;
    const leftSample = source[leftIndex] ?? source[source.length - 1] ?? 0;
    const rightSample = source[rightIndex] ?? leftSample;

    output[outputIndex] = leftSample + (rightSample - leftSample) * interpolation;
  }

  return output;
}

async function closeAudioContext(audioContext: AudioContext): Promise<void> {
  if (audioContext.state !== 'closed') {
    await audioContext.close();
  }
}

function createBrowserAudioContext(): AudioContext {
  const audioContextConstructor = window.AudioContext;

  if (!audioContextConstructor) {
    throw new Error('This browser does not expose AudioContext for uploaded audio decoding.');
  }

  return new audioContextConstructor();
}
