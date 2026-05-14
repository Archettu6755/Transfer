import { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  DEFAULT_USER_SETTINGS,
  PROVIDER_PRESETS,
  SOURCE_LANGUAGES,
  TARGET_LANGUAGES,
  type ProviderPreset,
  type UserSettings
} from 'shared';

const SETTINGS_STORAGE_KEY = 'userSettings';

function applyProviderPreset(settings: UserSettings, presetId: ProviderPreset): UserSettings {
  const preset = PROVIDER_PRESETS.find((entry) => entry.id === presetId);

  if (!preset) {
    return settings;
  }

  if (preset.id === 'custom') {
    return {
      ...settings,
      providerPreset: preset.id
    };
  }

  return {
    ...settings,
    providerPreset: preset.id,
    apiBaseUrl: preset.apiBaseUrl,
    modelName: preset.defaultModelName
  };
}

function Options() {
  const [settings, setSettings] = useState<UserSettings>(DEFAULT_USER_SETTINGS);
  const [statusMessage, setStatusMessage] = useState('Loading settings...');

  useEffect(() => {
    void loadSettings();
  }, []);

  async function loadSettings(): Promise<void> {
    const stored = await chrome.storage.local.get(SETTINGS_STORAGE_KEY);
    const nextSettings: UserSettings = {
      ...DEFAULT_USER_SETTINGS,
      ...(stored[SETTINGS_STORAGE_KEY] as Partial<UserSettings> | undefined)
    };
    setSettings(nextSettings);
    setStatusMessage('Settings loaded.');
  }

  async function saveSettings(): Promise<void> {
    await chrome.storage.local.set({ [SETTINGS_STORAGE_KEY]: settings });
    setStatusMessage('Settings saved locally.');
  }

  return (
    <main style={{ fontFamily: 'sans-serif', margin: '0 auto', maxWidth: 720, padding: 24 }}>
      <h1>Extension Options</h1>
      <section style={{ display: 'grid', gap: 12 }}>
        <label>
          Source Language
          <select
            value={settings.sourceLang}
            onChange={(event) =>
              setSettings({ ...settings, sourceLang: event.target.value as UserSettings['sourceLang'] })
            }
          >
            {SOURCE_LANGUAGES.map((language) => (
              <option key={language.code} value={language.code}>
                {language.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          Target Language
          <select
            value={settings.targetLang}
            onChange={(event) =>
              setSettings({ ...settings, targetLang: event.target.value as UserSettings['targetLang'] })
            }
          >
            {TARGET_LANGUAGES.map((language) => (
              <option key={language.code} value={language.code}>
                {language.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          Provider Preset
          <select
            value={settings.providerPreset}
            onChange={(event) =>
              setSettings(applyProviderPreset(settings, event.target.value as ProviderPreset))
            }
          >
            {PROVIDER_PRESETS.map((preset) => (
              <option key={preset.id} value={preset.id}>
                {preset.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          API Base URL
          <input
            type="text"
            value={settings.apiBaseUrl}
            onChange={(event) => setSettings({ ...settings, apiBaseUrl: event.target.value })}
          />
        </label>
        <label>
          API Key
          <input
            type="password"
            value={settings.apiKey}
            onChange={(event) => setSettings({ ...settings, apiKey: event.target.value })}
          />
        </label>
        <label>
          Model Name
          <input
            type="text"
            value={settings.modelName}
            onChange={(event) => setSettings({ ...settings, modelName: event.target.value })}
          />
        </label>
        <label>
          Show Source Text
          <input
            type="checkbox"
            checked={settings.showSourceText}
            onChange={(event) => setSettings({ ...settings, showSourceText: event.target.checked })}
          />
        </label>
        <label>
          Font Size
          <input
            type="number"
            min={12}
            max={48}
            value={settings.fontSize}
            onChange={(event) => setSettings({ ...settings, fontSize: Number(event.target.value) })}
          />
        </label>
        <label>
          Subtitle Position
          <select
            value={settings.subtitlePosition}
            onChange={(event) =>
              setSettings({
                ...settings,
                subtitlePosition: event.target.value as UserSettings['subtitlePosition']
              })
            }
          >
            <option value="bottom">Bottom</option>
            <option value="top">Top</option>
            <option value="floating">Floating</option>
          </select>
        </label>
        <label>
          Background Opacity
          <input
            type="range"
            min={0.1}
            max={1}
            step={0.05}
            value={settings.backgroundOpacity}
            onChange={(event) =>
              setSettings({ ...settings, backgroundOpacity: Number(event.target.value) })
            }
          />
        </label>
        <label>
          Debug Mode
          <input
            type="checkbox"
            checked={settings.debugEnabled}
            onChange={(event) => setSettings({ ...settings, debugEnabled: event.target.checked })}
          />
        </label>
        {settings.debugEnabled ? (
          <label>
            Debug Transcript Source
            <select
              value={settings.debugTranscriptSource}
              onChange={(event) =>
                setSettings({
                  ...settings,
                  debugTranscriptSource: event.target.value as UserSettings['debugTranscriptSource']
                })
              }
            >
              <option value="local-asr-stream">Local ASR Stream</option>
              <option value="mock">Mock Transcript</option>
            </select>
          </label>
        ) : null}
      </section>
      <div style={{ marginTop: 16 }}>
        <button onClick={() => void saveSettings()} type="button">
          Save Settings
        </button>
      </div>
      <p>{statusMessage}</p>
    </main>
  );
}

const container = document.getElementById('root');

if (!container) {
  throw new Error('Options root container was not found.');
}

createRoot(container).render(<Options />);
