import {
  SOURCE_LANGUAGES,
  TARGET_LANGUAGES,
  type SourceLanguage,
  type TargetLanguage,
  type UserSettings
} from 'shared';

interface LanguageSelectorProps {
  settings: UserSettings;
  onChange: (settings: UserSettings) => void;
}

export function LanguageSelector({ settings, onChange }: LanguageSelectorProps) {
  return (
    <section>
      <h2>Language Selection</h2>
      <label>
        Source Language
        <select
          onChange={(event) => {
            onChange({
              ...settings,
              sourceLang: event.target.value as SourceLanguage
            });
          }}
          value={settings.sourceLang}
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
          onChange={(event) => {
            onChange({
              ...settings,
              targetLang: event.target.value as TargetLanguage
            });
          }}
          value={settings.targetLang}
        >
          {TARGET_LANGUAGES.map((language) => (
            <option key={language.code} value={language.code}>
              {language.label}
            </option>
          ))}
        </select>
      </label>
    </section>
  );
}
