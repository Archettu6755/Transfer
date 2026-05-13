import { describe, expect, it } from 'vitest';
import {
  createAudioInputFromDecodedData,
  mixToMono,
  resampleLinear
} from './audioUtils';

describe('audioUtils', () => {
  it('mixes stereo channels into mono', () => {
    const mono = mixToMono([
      new Float32Array([1, 0, -1]),
      new Float32Array([0, 1, -1])
    ]);

    expect(Array.from(mono)).toEqual([0.5, 0.5, -1]);
  });

  it('resamples audio data to a target sample rate', () => {
    const input = new Float32Array([0, 1, 0, -1]);
    const output = resampleLinear(input, 4, 2);

    expect(output.length).toBe(2);
    expect(output[0]).toBeCloseTo(0);
    expect(output[1]).toBeCloseTo(0);
  });

  it('creates AudioInput from decoded channel data using the target sample rate', () => {
    const audioInput = createAudioInputFromDecodedData({
      id: 'clip-1',
      channelData: [new Float32Array([0, 1, 0, -1]), new Float32Array([0, 0, 0, 0])],
      durationMs: 1000,
      sampleRate: 4,
      targetSampleRate: 2
    });

    expect(audioInput).toMatchObject({
      id: 'clip-1',
      sampleRate: 2,
      durationMs: 1000
    });
    expect(Array.from(audioInput.data)).toEqual([0, 0]);
  });
});
