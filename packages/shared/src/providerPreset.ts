export type ProviderPreset = 'custom' | 'deepseek' | 'glm' | 'qwen' | 'kimi';

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
    defaultModelName: 'GLM-4.7-FlashX'
  },
  {
    id: 'qwen',
    label: 'Qwen',
    apiBaseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    defaultModelName: 'qwen-turbo'
  },
  {
    id: 'kimi',
    label: 'Kimi',
    apiBaseUrl: 'https://api.moonshot.cn/v1',
    defaultModelName: 'moonshot-v1-8k'
  }
] as const;
