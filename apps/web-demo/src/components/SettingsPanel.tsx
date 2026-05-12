import type { UserSettings } from 'shared';

export type TranslationMode = 'mock' | 'openai-compatible';

interface SettingsPanelProps {
  mode: TranslationMode;
  settings: UserSettings;
  onModeChange: (mode: TranslationMode) => void;
  onChange: (settings: UserSettings) => void;
}

export function SettingsPanel({ mode, settings, onModeChange, onChange }: SettingsPanelProps) {
  return (
    <section>
      <h2>Translation Settings</h2>
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
        {mode === 'mock'
          ? 'Mock mode keeps the demo offline and does not require an API key.'
          : 'OpenAI-compatible mode requires your Base URL, API Key, and Model Name.'}
      </p>
      {mode === 'openai-compatible' ? (
        <>
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
