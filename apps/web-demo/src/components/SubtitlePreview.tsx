import type { SubtitleSegment } from 'shared';

interface SubtitlePreviewProps {
  segment: SubtitleSegment | null;
  status: 'idle' | 'running' | 'done';
}

export function SubtitlePreview({ segment, status }: SubtitlePreviewProps) {
  return (
    <section>
      <h2>Subtitle Preview</h2>
      <p>Status: {status}</p>
      <p>Source: {segment?.source ?? 'No source subtitle yet.'}</p>
      <p>Translated: {segment?.translated ?? 'No translated subtitle yet.'}</p>
    </section>
  );
}
