import { DEFAULT_PROVIDER_PRESET, type ProviderPreset } from './providerPreset';
import type { SourceLanguage, TargetLanguage } from './language';

export interface UserSettings {
  sourceLang: SourceLanguage;
  targetLang: TargetLanguage;
  providerPreset: ProviderPreset;
  apiBaseUrl: string;
  apiKey: string;
  modelName: string;
  showSourceText: boolean;
  fontSize: number;
  subtitlePosition: 'top' | 'bottom' | 'floating';
  backgroundOpacity: number;
  debugEnabled: boolean;
}

export const DEFAULT_USER_SETTINGS: UserSettings = {
  sourceLang: 'ja',
  targetLang: 'zh-CN',
  providerPreset: DEFAULT_PROVIDER_PRESET,
  apiBaseUrl: '',
  apiKey: '',
  modelName: '',
  showSourceText: false,
  fontSize: 24,
  subtitlePosition: 'bottom',
  backgroundOpacity: 0.65,
  debugEnabled: false
};
