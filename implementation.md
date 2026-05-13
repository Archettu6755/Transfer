# implementation.md — Engineering Implementation Contract

> This document defines how to build the product described in `target.md`.
> It contains the required technical stack, package structure, core interfaces, provider requirements, implementation phases, and validation rules.

---

## 1. Technical Stack

Required:

- TypeScript
- pnpm workspace monorepo
- Vite
- React
- Chrome Extension Manifest V3

MVP must not use:

- Python
- Docker
- WSL2-specific runtime
- Local ASR server
- Cloud ASR
- Backend service

---

## 2. Repository Structure

Use this structure:

```text
vtuber-live-translator/
  README.md
  AGENTS.md
  target.md
  implementation.md
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
      public/
        icons/
      src/
        background/
          serviceWorker.ts
          messageRouter.ts
        popup/
          Popup.tsx
          popup.html
        options/
          Options.tsx
          options.html
        content/
          contentScript.ts
          overlay.ts
          overlay.css
        offscreen/
          offscreen.html
          offscreen.ts
        audio-worklet/
          captureProcessor.ts

  packages/
    shared/
      package.json
      src/
        language.ts
        providerPreset.ts
        audio.ts
        asr.ts
        translation.ts
        subtitle.ts
        settings.ts
        messages.ts
        index.ts

    core/
      package.json
      src/
        pipeline.ts
        index.ts

    asr-browser/
      package.json
      src/
        BrowserASRProvider.ts
        MockASRProvider.ts
        audioUtils.ts
        modelRegistry.ts
        index.ts

    translator/
      package.json
      src/
        OpenAICompatibleTranslator.ts
        MockTranslator.ts
        prompt.ts
        index.ts

    subtitle/
      package.json
      src/
        SubtitleStore.ts
        subtitleTiming.ts
        index.ts
```

---

## 3. Shared Types

All cross-package types live in `packages/shared/src`.

`packages/shared` may contain:

- Types
- Constants
- Simple pure utilities

It must not contain:

- Chrome API calls
- Fetch calls
- WASM/model loading
- React components
- ASR runtime logic
- Translator runtime logic

---

## 3.1 Language Types

File:

```text
packages/shared/src/language.ts
```

Required:

```ts
export type SourceLanguage = 'zh' | 'en' | 'ja';
export type TargetLanguage = 'zh-CN' | 'en';

export const SOURCE_LANGUAGES = [
  { code: 'zh', label: 'Mandarin Chinese' },
  { code: 'en', label: 'English' },
  { code: 'ja', label: 'Japanese' },
] as const;

export const TARGET_LANGUAGES = [
  { code: 'zh-CN', label: 'Simplified Chinese' },
  { code: 'en', label: 'English' },
] as const;

export const DEFAULT_SOURCE_LANGUAGE: SourceLanguage = 'ja';
export const DEFAULT_TARGET_LANGUAGE: TargetLanguage = 'zh-CN';
```

---

## 3.2 Settings Types

File:

```text
packages/shared/src/settings.ts
```

Required:

```ts
export interface UserSettings {
  sourceLang: SourceLanguage;
  targetLang: TargetLanguage;

  apiBaseUrl: string;
  apiKey: string;
  modelName: string;

  showSourceText: boolean;
  fontSize: number;
  subtitlePosition: 'top' | 'bottom' | 'floating';
  backgroundOpacity: number;

  debugEnabled: boolean;
}
```

Default:

```ts
export const DEFAULT_USER_SETTINGS: UserSettings = {
  sourceLang: 'ja',
  targetLang: 'zh-CN',
  apiBaseUrl: '',
  apiKey: '',
  modelName: '',
  showSourceText: false,
  fontSize: 24,
  subtitlePosition: 'bottom',
  backgroundOpacity: 0.65,
  debugEnabled: false,
};
```

---

## 3.3 Audio Types

File:

```text
packages/shared/src/audio.ts
```

Required:

```ts
export interface AudioInput {
  id: string;
  data: Float32Array;
  sampleRate: number;
  durationMs?: number;
}
```

---

## 3.4 ASR Types

File:

```text
packages/shared/src/asr.ts
```

Required:

```ts
export interface ASRResult {
  id: string;
  text: string;
  lang: SourceLanguage;
  timestamp: number;
  latencyMs?: number;
}

export interface ASRProvider {
  init(): Promise<void>;
  recognize(audio: AudioInput, lang: SourceLanguage): Promise<ASRResult>;
  dispose(): Promise<void>;
}
```

---

## 3.5 Translation Types

File:

```text
packages/shared/src/translation.ts
```

Required:

```ts
export interface TranslationResult {
  sourceText: string;
  translatedText: string;
  targetLang: TargetLanguage;
  latencyMs?: number;
}

export interface TranslatorProvider {
  translate(
    text: string,
    from: SourceLanguage,
    to: TargetLanguage
  ): Promise<TranslationResult>;
}
```

---

## 3.6 Subtitle Types

File:

```text
packages/shared/src/subtitle.ts
```

Required:

```ts
export interface SubtitleSegment {
  id: string;
  source: string;
  translated: string;
  sourceLang: SourceLanguage;
  targetLang: TargetLanguage;
  createdAt: number;
  status: 'asr_done' | 'translating' | 'translated' | 'error';
}
```

---

## 4. Core Pipeline

File:

```text
packages/core/src/pipeline.ts
```

The pipeline must:

1. Accept an `ASRProvider` and `TranslatorProvider` through dependency injection.
2. Accept audio input and user settings.
3. Call ASR with the selected source language.
4. Call translator with selected source and target languages.
5. Return a `SubtitleSegment`.
6. Preserve source text when translation fails.
7. Not import Chrome APIs.
8. Not instantiate concrete providers internally.

Recommended shape:

```ts
export class Pipeline {
  constructor(
    private readonly asr: ASRProvider,
    private readonly translator: TranslatorProvider
  ) {}

  async process(audio: AudioInput, settings: UserSettings): Promise<SubtitleSegment> {
    // implementation
  }
}
```

---

## 5. ASR Package

Path:

```text
packages/asr-browser/
```

---

## 5.1 MockASRProvider

File:

```text
packages/asr-browser/src/MockASRProvider.ts
```

Required behavior:

- Implements `ASRProvider`
- Returns fixed text by source language
- Simulates roughly 200ms delay
- Has no network, WASM, model, Chrome, or Node-specific dependency

Mock text:

```ts
const MOCK_ASR_TEXT = {
  en: 'Hello everyone, today we are playing Minecraft.',
  zh: '大家好，今天我们来玩 Minecraft。',
  ja: '今日はマイクラをやります。',
} as const;
```

---

## 5.2 BrowserASRProvider

File:

```text
packages/asr-browser/src/BrowserASRProvider.ts
```

Required behavior:

- Implements `ASRProvider`
- Loads a browser-side ASR model
- Runs model work in a Web Worker or otherwise avoids blocking UI
- Accepts `SourceLanguage`
- Supports uploaded audio first
- Later supports tab audio chunks
- Returns stable final text only for MVP

Candidate libraries:

- Transformers.js + Whisper / Distil-Whisper
- whisper.cpp WASM
- onnxruntime-web

Selection criteria:

- Works in latest Chrome
- Supports `zh`, `en`, `ja`
- Prefer model size under 100MB for first experiment
- Does not require local server
- Can run in browser context

Before implementing the real provider, produce a short decision note in code comments or docs explaining the selected library.

---

## 5.3 Audio Utilities

File:

```text
packages/asr-browser/src/audioUtils.ts
```

Required utilities:

- Decode uploaded audio file into audio data
- Convert to `Float32Array`
- Compute duration
- Convert stereo to mono if needed
- Resample if needed

Keep utilities browser-compatible.

---

## 6. Translator Package

Path:

```text
packages/translator/
```

---

## 6.1 Prompt Builder

File:

```text
packages/translator/src/prompt.ts
```

Required language maps:

```ts
export const SOURCE_LANGUAGE_NAMES = {
  zh: 'Mandarin Chinese',
  en: 'English',
  ja: 'Japanese',
} as const;

export const TARGET_LANGUAGE_NAMES = {
  'zh-CN': 'Simplified Chinese',
  en: 'English',
} as const;
```

Required system prompt:

```text
You are a professional live-stream subtitle translator.
Translate the following spoken content from {sourceLanguageName} to {targetLanguageName}.
Keep names, game titles, group names, and proper nouns unchanged when appropriate.
Do not explain. Do not summarize. Output only the translated subtitle.
```

---

## 6.2 MockTranslator

File:

```text
packages/translator/src/MockTranslator.ts
```

Required behavior:

- Implements `TranslatorProvider`
- Returns fixed text by target language
- Has no network dependency

Mock text:

```ts
const MOCK_TRANSLATION_TEXT = {
  'zh-CN': '大家好，今天我们来玩 Minecraft。',
  en: 'Hello everyone, today we are playing Minecraft.',
} as const;
```

---

## 6.3 OpenAICompatibleTranslator

File:

```text
packages/translator/src/OpenAICompatibleTranslator.ts
```

Required config:

```ts
export interface OpenAICompatibleConfig {
  apiBaseUrl: string;
  apiKey: string;
  modelName: string;
  timeoutMs?: number;
}
```

Required behavior:

1. Implements `TranslatorProvider`.
2. Uses `fetch`.
3. Uses `Authorization: Bearer {apiKey}`.
4. Uses user-provided `modelName`.
5. Uses prompt from `prompt.ts`.
6. Supports timeout.
7. Returns readable errors.
8. Never logs API key.

Endpoint rule:

- Prefer expecting `apiBaseUrl` to be the base origin plus API prefix, such as `https://api.example.com/v1`.
- Translator appends `/chat/completions`.
- If user provides a full `/chat/completions` URL, implementation may support it, but must document the behavior.

Request shape:

```ts
{
  model: modelName,
  messages: [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: text }
  ],
  temperature: 0.2
}
```

Response handling:

- Read `choices[0].message.content`
- Trim whitespace
- Return as `translatedText`

---

## 7. Subtitle Package

Path:

```text
packages/subtitle/
```

---

## 7.1 SubtitleStore

File:

```text
packages/subtitle/src/SubtitleStore.ts
```

Required behavior:

- Add segment
- Get latest segment
- Get recent segments
- Clear segments

Use in-memory storage for MVP.

---

## 7.2 Subtitle Timing

File:

```text
packages/subtitle/src/subtitleTiming.ts
```

Required:

```ts
export const DEFAULT_SUBTITLE_VISIBLE_MS = 6000;
```

MVP can use fixed duration.

---

## 8. Web Demo

Path:

```text
apps/web-demo/
```

Purpose:

- Fastest place to validate the pipeline
- No Chrome permissions
- No extension context
- No tab capture complexity

Components:

- `LanguageSelector.tsx`
- `AudioUploader.tsx`
- `SettingsPanel.tsx`
- `SubtitlePreview.tsx`
- `DebugPanel.tsx`

Web demo behavior by phase:

### Phase 1

- Use `MockASRProvider`
- Use `MockTranslator`
- Run pipeline end-to-end
- Display source and translated text

### Phase 2

- Keep MockASR
- Replace translator with `OpenAICompatibleTranslator`
- Allow Base URL / API Key / Model Name input
- Translate into `zh-CN` or `en`

### Phase 3

- Replace MockASR with `BrowserASRProvider`
- Upload audio file
- Run ASR
- Translate result
- Display subtitle preview

---

## 9. Chrome Extension

Path:

```text
apps/extension/
```

---

## 9.1 Manifest

File:

```text
apps/extension/manifest.json
```

Required:

- Manifest V3
- Background service worker
- Popup page
- Options page
- Content script
- Offscreen document if needed
- Permissions for storage and tab audio capture

Expected permissions may include:

```json
{
  "permissions": ["storage", "tabCapture", "offscreen", "scripting", "activeTab"],
  "host_permissions": ["<all_urls>"]
}
```

Keep permissions minimal where possible.

---

## 9.2 Options Page

Files:

```text
apps/extension/src/options/Options.tsx
apps/extension/src/options/options.html
```

Must save to `chrome.storage.local`:

- sourceLang
- targetLang
- apiBaseUrl
- apiKey
- modelName
- showSourceText
- fontSize
- subtitlePosition
- backgroundOpacity
- debugEnabled

---

## 9.3 Popup

Files:

```text
apps/extension/src/popup/Popup.tsx
apps/extension/src/popup/popup.html
```

Controls:

- Start
- Stop
- Current status
- Current language direction

Popup sends messages to background. It must not run ASR or translation itself.

---

## 9.4 Background

Files:

```text
apps/extension/src/background/serviceWorker.ts
apps/extension/src/background/messageRouter.ts
```

Responsibilities:

- Receive popup messages
- Load settings from `chrome.storage.local`
- Coordinate offscreen document
- Initialize pipeline
- Route subtitle updates to content script
- Handle stop/cleanup

---

## 9.5 Content Script and Overlay

Files:

```text
apps/extension/src/content/contentScript.ts
apps/extension/src/content/overlay.ts
apps/extension/src/content/overlay.css
```

Responsibilities:

- Inject subtitle overlay
- Render translated text
- Optionally render source text
- Apply style settings
- Receive subtitle update messages

Overlay default style:

- Bottom center
- High z-index
- Semi-transparent dark background
- Readable font size
- Does not block major page interactions

---

## 9.6 Offscreen Audio Capture

Files:

```text
apps/extension/src/offscreen/offscreen.html
apps/extension/src/offscreen/offscreen.ts
apps/extension/src/audio-worklet/captureProcessor.ts
```

Responsibilities:

- Use `chrome.tabCapture` in offscreen context
- Create `AudioContext`
- Route audio back to output so the user can still hear the stream
- Use `AudioWorklet` to emit audio chunks
- Send audio chunks to background or the pipeline layer

---

## 10. Implementation Phases

### Phase 0 — Infrastructure

Deliver:

- pnpm workspace
- root TypeScript config
- package scaffolding
- shared package with types

Validate:

```bash
pnpm install
pnpm -r build
pnpm -r type-check
```

---

### Phase 1 — Mock Pipeline + Web Demo

Deliver:

- Mock ASR
- Mock Translator
- Pipeline
- Web demo UI
- End-to-end mock flow

Validate:

```bash
pnpm --filter web-demo dev
pnpm --filter core test
```

---

### Phase 2 — OpenAI-compatible Translator

Deliver:

- Prompt builder
- OpenAI-compatible translator
- Web demo LLM settings
- Error display

Validate:

```bash
pnpm --filter translator test
pnpm --filter web-demo dev
```

---

### Phase 3 — Browser ASR in Web Demo

Deliver:

- Browser ASR provider
- Audio upload decode path
- Source language parameter
- ASR -> translation -> preview flow

Validate:

```bash
pnpm --filter asr-browser test
pnpm --filter web-demo dev
```

Manual validation:

- Upload English audio
- Upload Japanese audio
- Optional: upload Mandarin Chinese audio

---

### Phase 4 — Extension Skeleton

Deliver:

- Manifest V3
- Popup
- Options
- Content overlay
- Fake subtitle render

Validate:

```bash
pnpm --filter extension build
```

Manual validation:

- Load unpacked extension
- Open popup
- Open options
- Render fake subtitle on a page

---

### Phase 5 — Tab Audio Capture

Deliver:

- Offscreen document
- `chrome.tabCapture`
- `AudioContext`
- `AudioWorklet`
- Audio chunk logs
- Audio routed back to output

Validate:

```bash
pnpm --filter extension build
```

Manual validation:

- Start on Twitch / YouTube
- User still hears audio
- Debug logs show audio chunks

---

### Phase 6 — Full MVP Integration

Deliver:

- Tab audio -> Browser ASR
- ASR result -> OpenAI-compatible translation
- Translation -> content overlay
- Stop cleanup

Manual validation:

```text
Open Twitch / YouTube livestream
  -> Click Start
  -> Capture tab audio
  -> Recognize selected source language
  -> Translate into selected target language
  -> Display subtitle overlay
  -> Click Stop
  -> Processing stops
```

---

## 11. First Recommended Agent Task

Use this as the first coding task:

```text
Read AGENTS.md, target.md, and implementation.md.

Implement Phase 0 and Phase 1 only:
- Create the pnpm monorepo structure.
- Create packages/shared with language/audio/asr/translation/subtitle/settings types.
- Create MockASRProvider.
- Create MockTranslator.
- Create the Pipeline with dependency injection.
- Create a Vite React web-demo that runs the mock pipeline.

Do not implement Chrome extension audio capture.
Do not implement real browser ASR.
Do not implement OpenAI-compatible translator yet.
Do not add unsupported languages or deferred features.

Run available install/build/typecheck commands and summarize changed files and validation results.
```
