import { useEffect, useRef, useState } from 'react';
import { MockASRProvider } from 'asr-browser';
import { Pipeline } from 'core';
import {
  DEFAULT_USER_SETTINGS,
  type AudioInput,
  type SubtitleSegment,
  type TranslationResult,
  type TranslatorProvider,
  type UserSettings
} from 'shared';
import { MockTranslator, OpenAICompatibleTranslator } from 'translator';
import { AudioUploader } from './components/AudioUploader';
import { DebugPanel } from './components/DebugPanel';
import { LanguageSelector } from './components/LanguageSelector';
import { SettingsPanel, type TranslationMode } from './components/SettingsPanel';
import { SubtitlePreview } from './components/SubtitlePreview';

class ErrorReportingTranslator implements TranslatorProvider {
  public lastError = '';
  private readonly innerTranslator: TranslatorProvider;

  constructor(innerTranslator: TranslatorProvider) {
    this.innerTranslator = innerTranslator;
  }

  async translate(text: string, from: UserSettings['sourceLang'], to: UserSettings['targetLang']): Promise<TranslationResult> {
    this.lastError = '';

    try {
      return await this.innerTranslator.translate(text, from, to);
    } catch (error) {
      this.lastError = error instanceof Error ? error.message : 'Translation request failed.';
      throw error;
    }
  }
}

export default function App() {
  const [settings, setSettings] = useState<UserSettings>(DEFAULT_USER_SETTINGS);
  const [mode, setMode] = useState<TranslationMode>('mock');
  const [selectedFileName, setSelectedFileName] = useState<string>('');
  const [segment, setSegment] = useState<SubtitleSegment | null>(null);
  const [status, setStatus] = useState<'idle' | 'running' | 'done'>('idle');
  const [lastError, setLastError] = useState<string>('');
  const asrProviderRef = useRef(new MockASRProvider());

  useEffect(() => {
    void asrProviderRef.current.init();

    return () => {
      void asrProviderRef.current.dispose();
    };
  }, []);

  function buildTranslatorProvider(): ErrorReportingTranslator {
    if (mode === 'mock') {
      return new ErrorReportingTranslator(new MockTranslator());
    }

    return new ErrorReportingTranslator(
      new OpenAICompatibleTranslator({
        apiBaseUrl: settings.apiBaseUrl,
        apiKey: settings.apiKey,
        modelName: settings.modelName
      })
    );
  }

  async function runTranslation() {
    setStatus('running');
    setLastError('');

    const audioInput: AudioInput = {
      id: selectedFileName || 'mock-audio',
      data: new Float32Array(),
      sampleRate: 16_000,
      durationMs: 1_000
    };

    const translatorProvider = buildTranslatorProvider();
    const pipeline = new Pipeline({
      asrProvider: asrProviderRef.current,
      translatorProvider
    });

    const nextSegment = await pipeline.process(audioInput, settings);
    setSegment(nextSegment);
    setLastError(translatorProvider.lastError);
    setStatus('done');
  }

  return (
    <main style={{ fontFamily: 'sans-serif', margin: '0 auto', maxWidth: 960, padding: 24 }}>
      <h1>Browser Live Translator Web Demo</h1>
      <p>Phase 1 mock mode and Phase 2 OpenAI-compatible mode are both available in this demo.</p>
      <LanguageSelector settings={settings} onChange={setSettings} />
      <AudioUploader selectedFileName={selectedFileName} onSelectFileName={setSelectedFileName} />
      <SettingsPanel
        mode={mode}
        settings={settings}
        onModeChange={setMode}
        onChange={setSettings}
      />
      <button onClick={() => void runTranslation()} type="button">
        Run Translation
      </button>
      <SubtitlePreview segment={segment} status={status} />
      <DebugPanel
        sourceLang={settings.sourceLang}
        targetLang={settings.targetLang}
        lastAsrText={segment?.source ?? ''}
        lastTranslatedText={segment?.translated ?? ''}
        audioCaptureState={selectedFileName ? `selected: ${selectedFileName}` : 'mock-audio'}
        lastError={lastError}
        asrProvider="MockASRProvider"
        translatorProvider={
          mode === 'mock' ? 'MockTranslator' : 'OpenAICompatibleTranslator'
        }
      />
    </main>
  );
}
