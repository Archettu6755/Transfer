import type { SourceLanguage, TargetLanguage } from 'shared';

interface DebugPanelProps {
  sourceLang: SourceLanguage;
  targetLang: TargetLanguage;
  asrProvider: string;
  translatorProvider: string;
  lastAsrText: string;
  lastTranslatedText: string;
  audioCaptureState: string;
  lastError: string;
}

export function DebugPanel({
  sourceLang,
  targetLang,
  asrProvider,
  translatorProvider,
  lastAsrText,
  lastTranslatedText,
  audioCaptureState,
  lastError
}: DebugPanelProps) {
  return (
    <section>
      <h2>Debug Panel</h2>
      <dl>
        <dt>Source language</dt>
        <dd>{sourceLang}</dd>
        <dt>Target language</dt>
        <dd>{targetLang}</dd>
        <dt>ASR provider</dt>
        <dd>{asrProvider}</dd>
        <dt>Translator provider</dt>
        <dd>{translatorProvider}</dd>
        <dt>Last ASR text</dt>
        <dd>{lastAsrText || 'N/A'}</dd>
        <dt>Last translated text</dt>
        <dd>{lastTranslatedText || 'N/A'}</dd>
        <dt>Audio capture state</dt>
        <dd>{audioCaptureState}</dd>
        <dt>Last error</dt>
        <dd>{lastError || 'N/A'}</dd>
      </dl>
    </section>
  );
}
