export type ProviderPreset = 'custom' | 'deepseek' | 'glm';

export interface ProviderPresetDefinition {
  id: ProviderPreset;
  label: string;
  apiBaseUrl: string;
  defaultModelName: string;
}

export const DEFAULT_PROVIDER_PRESET: ProviderPreset = 'custom';

export const PROVIDER_PRESETS: readonly ProviderPresetDefinition[] = [
  {
    id: 'custom',
    label: 'Custom',
    apiBaseUrl: '',
    defaultModelName: ''
  },
  {
    id: 'deepseek',
    label: 'DeepSeek',
    apiBaseUrl: 'https://api.deepseek.com',
    defaultModelName: 'deepseek-v4-flash'
  },
  {
    id: 'glm',
    label: 'GLM',
    apiBaseUrl: 'https://open.bigmodel.cn/api/paas/v4/',
    defaultModelName: 'glm-5.1'
  }
] as const;
