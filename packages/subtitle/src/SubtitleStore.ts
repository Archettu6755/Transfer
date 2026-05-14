import type { SubtitleSegment } from 'shared';

export class SubtitleStore {
  private readonly segments: SubtitleSegment[] = [];

  addSegment(segment: SubtitleSegment): void {
    this.segments.push(segment);
  }

  getLatestSegment(): SubtitleSegment | null {
    return this.segments.at(-1) ?? null;
  }

  getRecentSegments(limit?: number): SubtitleSegment[] {
    if (limit === undefined || limit >= this.segments.length) {
      return [...this.segments];
    }

    return this.segments.slice(-limit);
  }

  clear(): void {
    this.segments.length = 0;
  }
}
