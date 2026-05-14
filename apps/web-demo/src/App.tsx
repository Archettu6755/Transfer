import { useEffect, useRef, useState } from 'react';
import {
  LocalASRProvider,
  createAudioInputFromFile as decodeAudioFileToInput,
  MockASRProvider
} from 'asr-local';
import { Pipeline } from 'core';
import {
  type ASRProvider,
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
import {
  SettingsPanel,
  type ASRMode,
  type TranslationMode
} from './components/SettingsPanel';
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

interface AppProps {
  createAudioInputFromFile?: (file: File) => Promise<AudioInput>;
  createLocalAsrProvider?: () => ASRProvider;
  createMockAsrProvider?: () => ASRProvider;
}

export default function App({
  createAudioInputFromFile = decodeAudioFileToInput,
  createLocalAsrProvider = () => new LocalASRProvider(),
  createMockAsrProvider = () => new MockASRProvider()
}: AppProps) {
  const [settings, setSettings] = useState<UserSettings>(DEFAULT_USER_SETTINGS);
  const [asrMode, setAsrMode] = useState<ASRMode>('mock');
  const [mode, setMode] = useState<TranslationMode>('mock');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedFileName, setSelectedFileName] = useState<string>('');
  const [segment, setSegment] = useState<SubtitleSegment | null>(null);
  const [status, setStatus] = useState<'idle' | 'running' | 'done'>('idle');
  const [lastError, setLastError] = useState<string>('');
  const asrProviderRef = useRef<ASRProvider | null>(null);
  const asrProviderInitRef = useRef<Promise<void>>(Promise.resolve());

  useEffect(() => {
    const provider = asrMode === 'mock' ? createMockAsrProvider() : createLocalAsrProvider();
    asrProviderRef.current = provider;
    const initPromise = provider.init();
    asrProviderInitRef.current = initPromise;

    void initPromise.catch((error) => {
      setLastError(error instanceof Error ? error.message : 'Failed to initialize ASR provider.');
    });

    return () => {
      if (asrProviderRef.current === provider) {
        asrProviderRef.current = null;
      }

      asrProviderInitRef.current = Promise.resolve();
      void provider.dispose();
    };
  }, [asrMode, createLocalAsrProvider, createMockAsrProvider]);

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

  async function buildAudioInput(): Promise<AudioInput> {
    if (asrMode === 'local') {
      if (!selectedFile) {
        throw new Error('Select an audio file before running Local ASR mode.');
      }

      return await createAudioInputFromFile(selectedFile);
    }

    return {
      id: selectedFileName || 'mock-audio',
      data: new Float32Array(),
      sampleRate: 16_000,
      durationMs: 1_000
    };
  }

  async function runTranslation() {
    setStatus('running');
    setLastError('');

    try {
      const audioInput = await buildAudioInput();
      const asrProvider = asrProviderRef.current;

      if (!asrProvider) {
        throw new Error('ASR provider is not ready.');
      }

      await asrProviderInitRef.current;

      const translatorProvider = buildTranslatorProvider();
      const pipeline = new Pipeline({
        asrProvider,
        translatorProvider
      });

      const nextSegment = await pipeline.process(audioInput, settings);
      setSegment(nextSegment);
      setLastError(translatorProvider.lastError);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      setLastError(message);
      setSegment((currentSegment) =>
        currentSegment ?? {
          id: selectedFileName || 'local-audio',
          source: '',
          translated: '',
          sourceLang: settings.sourceLang,
          targetLang: settings.targetLang,
          createdAt: Date.now(),
          status: 'error'
        }
      );
    } finally {
      setStatus('done');
    }
  }

  return (
    <main style={{ fontFamily: 'sans-serif', margin: '0 auto', maxWidth: 960, padding: 24 }}>
      <h1>Local Subtitle Validation Demo</h1>
      <p>Fixed direction: ja -&gt; zh-CN.</p>
      <p>Debug mode keeps mock and local file-validation ASR paths for regression checks.</p>
      <AudioUploader
        selectedFile={selectedFile}
        selectedFileName={selectedFileName}
        onSelectFile={(file) => {
          setSelectedFile(file);
          setSelectedFileName(file?.name ?? '');
        }}
      />
      <SettingsPanel
        asrMode={asrMode}
        mode={mode}
        settings={settings}
        onAsrModeChange={setAsrMode}
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
        audioCaptureState={
          asrMode === 'local'
            ? selectedFileName
              ? `selected: ${selectedFileName}`
              : 'awaiting uploaded audio'
            : 'mock-audio'
        }
        lastError={lastError}
        asrProvider={asrMode === 'mock' ? 'MockASRProvider' : 'LocalASRProvider'}
        translatorProvider={
          mode === 'mock' ? 'MockTranslator' : 'OpenAICompatibleTranslator'
        }
      />
    </main>
  );
}
