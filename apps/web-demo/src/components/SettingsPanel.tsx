import { PROVIDER_PRESETS, type ProviderPreset, type UserSettings } from 'shared';

export type ASRMode = 'mock' | 'browser';
export type TranslationMode = 'mock' | 'openai-compatible';

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

interface SettingsPanelProps {
  asrMode: ASRMode;
  mode: TranslationMode;
  settings: UserSettings;
  onAsrModeChange: (mode: ASRMode) => void;
  onModeChange: (mode: TranslationMode) => void;
  onChange: (settings: UserSettings) => void;
}

export function SettingsPanel({
  asrMode,
  mode,
  settings,
  onAsrModeChange,
  onModeChange,
  onChange
}: SettingsPanelProps) {
  return (
    <section>
      <h2>Provider Settings</h2>
      <label>
        ASR Mode
        <select
          aria-label="ASR Mode"
          onChange={(event) => onAsrModeChange(event.target.value as ASRMode)}
          value={asrMode}
        >
          <option value="mock">Mock ASR</option>
          <option value="browser">Browser ASR</option>
        </select>
      </label>
      <label>
        Translation Mode
        <select
          aria-label="Translation Mode"
          onChange={(event) => onModeChange(event.target.value as TranslationMode)}
          value={mode}
        >
          <option value="mock">Mock Mode</option>
          <option value="openai-compatible">OpenAI-Compatible Mode</option>
        </select>
      </label>
      <p>
        {asrMode === 'browser'
          ? 'Browser ASR requires an uploaded audio file and runs the selected model in a worker.'
          : 'Mock ASR keeps speech recognition offline and deterministic for regression checks.'}
      </p>
      <p>
        {mode === 'mock'
          ? 'Mock translation keeps the demo offline and does not require an API key.'
          : 'OpenAI-compatible translation requires your Base URL, API Key, and Model Name.'}
      </p>
      {mode === 'openai-compatible' ? (
        <>
          <label>
            Provider Preset
            <select
              aria-label="Provider Preset"
              onChange={(event) =>
                onChange(applyProviderPreset(settings, event.target.value as ProviderPreset))
              }
              value={settings.providerPreset}
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
              aria-label="API Base URL"
              onChange={(event) => onChange({ ...settings, apiBaseUrl: event.target.value })}
              type="text"
              value={settings.apiBaseUrl}
            />
          </label>
          <label>
            API Key
            <input
              aria-label="API Key"
              onChange={(event) => onChange({ ...settings, apiKey: event.target.value })}
              type="password"
              value={settings.apiKey}
            />
          </label>
          <label>
            Model Name
            <input
              aria-label="Model Name"
              onChange={(event) => onChange({ ...settings, modelName: event.target.value })}
              type="text"
              value={settings.modelName}
            />
          </label>
        </>
      ) : null}
      <label>
        Show Source Text
        <input
          checked={settings.showSourceText}
          onChange={(event) => onChange({ ...settings, showSourceText: event.target.checked })}
          type="checkbox"
        />
      </label>
    </section>
  );
}
