export interface AudioInput {
  id: string;
  data: Float32Array;
  sampleRate: number;
  durationMs?: number;
}
