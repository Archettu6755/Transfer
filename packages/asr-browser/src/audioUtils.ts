import type { AudioInput } from 'shared';

export interface DecodedAudioData {
  id: string;
  channelData: Float32Array[];
  sampleRate: number;
  durationMs: number;
}

export async function createAudioInputFromFile(
  file: File,
  targetSampleRate = 16_000
): Promise<AudioInput> {
  const decoded = await decodeAudioFile(file);
  return createAudioInputFromDecodedData({
    ...decoded,
    targetSampleRate
  });
}

export async function decodeAudioFile(file: Blob): Promise<DecodedAudioData> {
  if (typeof AudioContext === 'undefined') {
    throw new Error('Audio decoding requires AudioContext support in the current environment.');
  }

  const audioContext = new AudioContext();

  try {
    const arrayBuffer = await file.arrayBuffer();
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
    const channelData = Array.from({ length: audioBuffer.numberOfChannels }, (_, index) =>
      audioBuffer.getChannelData(index).slice()
    );

    return {
      id: file instanceof File ? file.name : `audio-${Date.now()}`,
      channelData,
      sampleRate: audioBuffer.sampleRate,
      durationMs: Math.round(audioBuffer.duration * 1000)
    };
  } finally {
    await audioContext.close();
  }
}

export function createAudioInputFromDecodedData(input: {
  id: string;
  channelData: Float32Array[];
  sampleRate: number;
  durationMs: number;
  targetSampleRate?: number;
}): AudioInput {
  const mono = mixToMono(input.channelData);
  const targetSampleRate = input.targetSampleRate ?? input.sampleRate;
  const data =
    input.sampleRate === targetSampleRate
      ? mono
      : resampleLinear(mono, input.sampleRate, targetSampleRate);

  return {
    id: input.id,
    data,
    sampleRate: targetSampleRate,
    durationMs: input.durationMs
  };
}

export function mixToMono(channelData: readonly Float32Array[]): Float32Array {
  const [firstChannel] = channelData;

  if (!firstChannel) {
    return new Float32Array();
  }

  if (channelData.length === 1) {
    return firstChannel.slice();
  }

  const output = new Float32Array(firstChannel.length);

  for (let sampleIndex = 0; sampleIndex < firstChannel.length; sampleIndex += 1) {
    let mixedValue = 0;

    for (const channel of channelData) {
      mixedValue += channel[sampleIndex] ?? 0;
    }

    output[sampleIndex] = mixedValue / channelData.length;
  }

  return output;
}

export function resampleLinear(
  input: Float32Array,
  inputSampleRate: number,
  outputSampleRate: number
): Float32Array {
  if (inputSampleRate <= 0 || outputSampleRate <= 0) {
    throw new Error('Sample rates must be positive numbers.');
  }

  if (input.length === 0 || inputSampleRate === outputSampleRate) {
    return input.slice();
  }

  const outputLength = Math.max(1, Math.round((input.length * outputSampleRate) / inputSampleRate));
  const output = new Float32Array(outputLength);
  const ratio = inputSampleRate / outputSampleRate;

  for (let outputIndex = 0; outputIndex < outputLength; outputIndex += 1) {
    const sourceIndex = outputIndex * ratio;
    const lowerIndex = Math.floor(sourceIndex);
    const upperIndex = Math.min(lowerIndex + 1, input.length - 1);
    const interpolation = sourceIndex - lowerIndex;
    const lowerValue = input[lowerIndex] ?? 0;
    const upperValue = input[upperIndex] ?? lowerValue;

    output[outputIndex] = lowerValue + (upperValue - lowerValue) * interpolation;
  }

  return output;
}
