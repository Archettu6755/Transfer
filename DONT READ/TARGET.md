# TARGET.md — Browser-native Live Translator

> 本文档是项目的**唯一目标基准文件**。Agent 在生成代码、做架构决策、确定交付物范围时，必须以本文档为准。

---

## 项目定位

构建一个**完全运行于浏览器端、无需本地服务器**的实时直播翻译 Chrome 插件。

核心价值主张：
- 零部署：用户不需要安装 Python / Docker / WSL2
- 隐私安全：API Key 存储在用户本地，不经过任何中间服务器
- 可组合：ASR 和 Translator 使用 Provider 抽象，方便后续替换实现

核心数据流：
```
当前标签页音频
  → 浏览器端 ASR（Web Worker + WASM）
  → OpenAI-compatible LLM API
  → 页面 Overlay 字幕
```

---

## 语言支持范围（硬性约束）

### ASR 识别语言（sourceLang）
| 显示名 | 代码 |
|---|---|
| Mandarin Chinese | `zh` |
| English | `en` |
| Japanese | `ja` |

### 翻译目标语言（targetLang）
| 显示名 | 代码 |
|---|---|
| Chinese | `zh-CN` |
| English | `en` |

**默认值**：`sourceLang = ja`，`targetLang = zh-CN`

**本阶段明确不支持**（不得在代码中预埋入口）：
- 自动语言检测
- 韩语识别 / 输出
- 日文输出
- 云端 ASR / 本地 ASR Server
- 用户术语表

---

## 阶段目标与交付物

### Phase 0 — 基础设施（前置）

**目标**：搭建 monorepo，确保所有包可以互相引用，CI 能跑通。

交付物：
```
vtuber-live-translator/
  package.json            # pnpm workspace root
  pnpm-workspace.yaml
  tsconfig.base.json
  packages/shared/        # 仅类型定义，无运行时依赖
```

共享类型（`packages/shared/src/`）：
```ts
// language.ts
type SourceLanguage = 'zh' | 'en' | 'ja';
type TargetLanguage = 'zh-CN' | 'en';

// asr.ts
interface ASRResult { text: string; lang: SourceLanguage; timestamp: number; }

// translation.ts
interface TranslationResult { sourceText: string; translatedText: string; targetLang: TargetLanguage; }

// subtitle.ts
interface SubtitleSegment { id: string; source: string; translated: string; createdAt: number; }

// settings.ts
interface UserSettings {
  sourceLang: SourceLanguage;
  targetLang: TargetLanguage;
  apiBaseUrl: string;
  apiKey: string;
  modelName: string;
  showSourceText: boolean;
  fontSize: number;
  subtitlePosition: 'top' | 'bottom';
}
```

验收：`pnpm -r build` 无报错，类型可在其他包中 import。

---

### Phase 1 — Mock Pipeline + Web Demo

**目标**：在不涉及真实 ASR 和 LLM 的情况下，跑通完整 UI 和数据流。

**核心原则**：先让 Mock 链路 end-to-end 跑通，再替换真实实现。

#### 1.1 Core Pipeline（`packages/core/`）

```ts
// pipeline.ts 接口约束
interface ASRProvider {
  recognize(audio: AudioBuffer, lang: SourceLanguage): Promise<ASRResult>;
}

interface TranslatorProvider {
  translate(text: string, from: SourceLanguage, to: TargetLanguage): Promise<TranslationResult>;
}

class Pipeline {
  constructor(asr: ASRProvider, translator: TranslatorProvider) {}
  async process(audio: AudioBuffer, settings: UserSettings): Promise<SubtitleSegment> {}
}
```

验收：Pipeline 单元测试可用 MockASR + MockTranslator 跑通。

#### 1.2 MockASRProvider（`packages/asr-browser/src/MockASRProvider.ts`）

- 根据 `sourceLang` 返回对应语言的固定示例文本：
  - `en`: `"Hello everyone, today we are playing Minecraft."`
  - `zh`: `"大家好，今天我们来玩 Minecraft。"`
  - `ja`: `"今日はマイクラをやります。"`
- 模拟 200ms 延迟

验收：不依赖任何 WASM / 网络，纯 TS 即可运行。

#### 1.3 MockTranslator（`packages/translator/src/MockTranslator.ts`）

- 根据 `targetLang` 返回固定翻译文本
- 不依赖网络

验收：与 MockASRProvider 串联后，`SubtitleSegment` 含有正确的 `source` 和 `translated` 字段。

#### 1.4 Web Demo（`apps/web-demo/`）

技术栈：Vite + React + TypeScript

页面包含以下组件：
- `LanguageSelector.tsx`：Source / Target 下拉选择，默认 `ja → zh-CN`
- `AudioUploader.tsx`：本地音频文件上传，显示文件名，传给 Pipeline
- `SettingsPanel.tsx`：API Base URL / API Key / Model Name 输入框
- `SubtitlePreview.tsx`：显示 sourceText、translatedText、当前语言方向
- `DebugPanel.tsx`：显示 Pipeline 各阶段日志

验收标准：
1. `pnpm dev` 可正常启动
2. Mock 模式下无需网络，完整流程可运行
3. 页面显示源文本和翻译文本

---

### Phase 2 — 真实 Translator 接入

**目标**：接入 OpenAI-compatible LLM API，替换 MockTranslator。

交付物：
- `packages/translator/src/OpenAICompatibleTranslator.ts`
- `packages/translator/src/prompt.ts`

API 调用规范：
- 使用 `fetch` 调用 `{apiBaseUrl}/v1/chat/completions`
- 请求头携带 `Authorization: Bearer {apiKey}`
- Model 由用户配置，不硬编码
- System prompt 在 `prompt.ts` 中集中维护

System Prompt 要求：
```
You are a professional subtitle translator.
Translate the following text to {targetLang}.
Output only the translated text. No explanations. No punctuation changes.
```

验收标准：
- 用户填写 API 配置后，能将日文/英文/中文文本翻译成目标语言
- API Key 不出现在任何源码文件中
- 网络失败时有明确错误提示

---

### Phase 3 — 浏览器端 ASR 接入

**目标**：用真实浏览器 ASR 替换 MockASRProvider。

#### 3.1 方案选型（任务 3.3.1）

候选方案评估维度：
- 模型大小（首选 < 100MB）
- 浏览器兼容性（Chrome 最新版）
- 多语言支持（zh / en / ja）
- 推理速度（目标 RTF < 0.5）

推荐优先评估：Transformers.js + Whisper / Distil-Whisper

验收：输出选型决策文档，包含实测数据。

#### 3.2 BrowserASRProvider（`packages/asr-browser/src/BrowserASRProvider.ts`）

- 实现 `ASRProvider` 接口
- 在 Web Worker 中运行模型，不阻塞主线程
- 接受 `sourceLang` 参数，传递给 ASR 模型
- 支持上传音频文件作为输入

验收：至少稳定识别 `en` 和 `ja`，识别结果进入 Pipeline。

---

### Phase 4 — Chrome Extension

**目标**：将 Web Demo 的能力封装进 Chrome 插件，实现对 Twitch / YouTube 直播的实时翻译。

#### 4.1 Extension 基础结构（`apps/extension/`）

```
manifest.json           # Manifest V3
src/background/
  serviceWorker.ts      # 生命周期管理、消息路由
src/popup/
  Popup.tsx             # Start / Stop / 当前状态
src/options/
  Options.tsx           # 全量配置页
src/content/
  contentScript.ts      # 注入页面
  overlay.ts            # 字幕层逻辑
  overlay.css
src/offscreen/
  offscreen.html
  offscreen.ts          # tabCapture 在此运行
src/audio-worklet/
  captureProcessor.ts
```

验收：插件可加载，Popup 可打开，Options 页面可保存配置。

#### 4.2 配置持久化

存储后端：`chrome.storage.local`

存储字段（对应 `UserSettings` 类型）：
- `sourceLang` / `targetLang`
- `apiBaseUrl` / `apiKey` / `modelName`
- `showSourceText` / `fontSize` / `subtitlePosition`

验收：插件重启后配置仍然存在。

#### 4.3 Tab 音频捕获

- 使用 `chrome.tabCapture` API 在 offscreen document 中捕获音频
- 使用 `AudioWorklet` 输出 PCM chunk
- 用户仍可正常听到直播声音（不静音）

验收：Debug 日志显示音频 chunk 持续输出。

#### 4.4 完整 MVP 数据流

```
tab audio chunk
  → BrowserASRProvider（Web Worker）
  → OpenAICompatibleTranslator
  → Overlay 字幕渲染
```

验收（最终 MVP）：
1. 在 Twitch / YouTube 直播页面点击 Start
2. 浏览器 ASR 识别直播音频
3. LLM 翻译识别文本
4. 页面底部显示翻译字幕
5. 全程无需 Python / Docker / 本地服务

---

## 文件结构（最终目标）

```
vtuber-live-translator/
  README.md
  TARGET.md               ← 本文件
  AGENTS.md
  任务计划书.md
  package.json
  pnpm-workspace.yaml
  tsconfig.base.json

  apps/
    web-demo/
      package.json
      index.html
      vite.config.ts
      src/
        main.tsx
        App.tsx
        components/
          AudioUploader.tsx
          LanguageSelector.tsx
          SettingsPanel.tsx
          SubtitlePreview.tsx
          DebugPanel.tsx

    extension/
      package.json
      vite.config.ts
      manifest.json
      public/icons/
      src/
        background/serviceWorker.ts
        popup/Popup.tsx
        options/Options.tsx
        content/contentScript.ts
        content/overlay.ts
        content/overlay.css
        offscreen/offscreen.html
        offscreen/offscreen.ts
        audio-worklet/captureProcessor.ts

  packages/
    shared/src/
      language.ts / audio.ts / asr.ts
      translation.ts / subtitle.ts
      settings.ts / messages.ts / index.ts

    core/src/
      pipeline.ts / index.ts

    asr-browser/src/
      BrowserASRProvider.ts
      MockASRProvider.ts
      audioUtils.ts / modelRegistry.ts / index.ts

    translator/src/
      OpenAICompatibleTranslator.ts
      MockTranslator.ts
      prompt.ts / index.ts

    subtitle/src/
      SubtitleStore.ts
      subtitleTiming.ts / index.ts
```

---

## 非目标（本阶段不实现）

以下功能不在任何交付物中出现，不预埋入口，不写 TODO：

- 自动语言检测
- 韩语识别 / 输出 / 日文输出
- 用户术语表
- 平台字幕抓取（不使用 DOM 字幕）
- 本地 ASR Server / 云端 ASR
- 多说话人分离
- AI 配音
- 字幕导出
- 账号系统
