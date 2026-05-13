# target.md — Product Target

> This document defines what the product should become.
> It describes product scope, user-facing behavior, supported languages, UI shape, and non-goals.
> Implementation details belong in `implementation.md`.

---

## 1. Product Positioning

Build a browser-native live translation Chrome extension for livestreams.

The MVP captures the current browser tab audio, runs speech recognition in the browser, translates the transcript through a user-provided OpenAI-compatible LLM API, and renders subtitles on the livestream page.

Core value:

- **No deployment:** no Python, Docker, WSL2, CUDA, local ASR server, or cloud ASR required.
- **Local audio processing:** livestream audio is processed in the browser for ASR.
- **User-owned LLM credentials:** the user enters their own API Base URL, API Key, and Model Name.
- **Composable architecture:** ASR and Translator are provider-based so they can be replaced later.

Core product flow:

```text
Current tab audio
  -> Browser-side ASR
  -> Source-language text
  -> OpenAI-compatible LLM translation
  -> Subtitle overlay on page
```

---

## 2. MVP Language Scope

### 2.1 Source languages

The user manually selects one source language.

| Display name | Code |
|---|---|
| Mandarin Chinese | `zh` |
| English | `en` |
| Japanese | `ja` |

Default:

```text
sourceLang = ja
```

### 2.2 Target languages

The user manually selects one target language.

| Display name | Code |
|---|---|
| Simplified Chinese | `zh-CN` |
| English | `en` |

Default:

```text
targetLang = zh-CN
```

### 2.3 Default direction

The default direction is:

```text
Japanese audio -> Simplified Chinese subtitles
```

---

## 3. Product Scope

## 3.1 Web Demo

Before the Chrome extension is fully integrated, the project must provide a web demo.

Purpose:

- Validate the pipeline without Chrome extension permissions.
- Test mock ASR and mock translation.
- Test OpenAI-compatible translation.
- Test browser ASR on uploaded audio.

The web demo should include:

- Source language selector
- Target language selector
- Audio file uploader
- LLM settings form
- Provider preset selector for OpenAI-compatible endpoints
- Subtitle preview
- Debug panel

---

## 3.2 Chrome Extension

The final MVP product is a Chrome extension.

The extension should provide:

- Popup with Start / Stop controls
- Options page for settings
- Current tab audio capture
- Browser ASR
- OpenAI-compatible LLM translation
- Subtitle overlay injected into Twitch / YouTube pages

---

## 4. User-facing Features

### 4.1 Start / Stop

The popup must provide:

- Start button
- Stop button
- Current status
- Current language direction

Start should begin the full pipeline.

Stop should stop audio capture, stop ASR/translation processing, and clean up resources.

---

### 4.2 Settings

The Options page must allow the user to configure:

- Source language: `zh`, `en`, `ja`
- Target language: `zh-CN`, `en`
- Provider preset for supported OpenAI-compatible services
- API Base URL
- API Key
- Model Name
- Show source text on subtitle overlay
- Font size
- Subtitle position
- Background opacity
- Debug mode

Settings must persist locally.

---

### 4.3 LLM API Configuration

The product uses OpenAI-compatible Chat Completions.

The user must always be able to provide:

```text
API Base URL
API Key
Model Name
```

To simplify setup, the product may also provide a small set of provider presets for known OpenAI-compatible services.

Preset behavior:

- Selecting a preset may automatically fill a recommended API Base URL.
- Selecting a preset may automatically fill a recommended default Model Name.
- The user must still provide their own API Key.
- The user must always be able to switch to a Custom preset and manually edit Base URL and Model Name.

The product must not hardcode provider-specific credentials.

The product should work with any endpoint that follows the expected OpenAI-compatible request/response shape.
Provider presets are a convenience layer only and must not remove support for custom OpenAI-compatible endpoints.

---

### 4.4 Subtitle Overlay

The subtitle overlay must be injected into the livestream page.

Minimum behavior:

- Show translated subtitle text.
- Optionally show source text.
- Default to bottom-center placement.
- Use readable font size.
- Use a semi-transparent background.
- Avoid covering too much of the video.
- Support basic style settings.

Supported overlay positions for MVP:

```text
bottom
top
floating
```

Default display:

```text
translated text only
```

---

### 4.5 Debug Panel

The product should expose basic debug information to help troubleshoot early builds.

Useful fields:

- Source language
- Target language
- ASR provider
- Translator provider
- Last ASR text
- Last translated text
- Audio capture state
- Last error

This can be simple and developer-oriented in the MVP.

---

## 5. Product Non-goals for MVP

The following must not appear in MVP UI, settings, hidden flags, TODOs, or pre-created extension points unless the user explicitly updates scope:

- Automatic language detection
- Korean recognition or output
- Japanese subtitle output
- User glossary / terminology table
- Platform caption extraction
- Google Live Caption integration
- Cloud ASR
- Local ASR server
- Docker / Python / WSL2 ASR
- Speaker diarization
- AI dubbing
- Subtitle export
- Account system
- Cloud sync
- Payment system

---

## 6. UX Principles

The MVP should feel:

- Lightweight
- Local-first
- Simple to configure
- Easy to start and stop
- Non-intrusive on video pages
- Clear when errors occur

It should not feel like a full translation platform yet.

The first product milestone is only to prove the browser-native livestream translation loop.

---

## 7. MVP Acceptance Criteria

The MVP is complete when:

1. The extension can be loaded into Chrome.
2. The user can configure source language, target language, API Base URL, API Key, and Model Name, either manually or through a provider preset that auto-fills recommended values.
3. The user can open a Twitch or YouTube livestream and click Start.
4. The extension captures current tab audio.
5. Browser-side ASR produces source-language text.
6. The translator converts source text into `zh-CN` or `en`.
7. The content script displays translated subtitles on the page.
8. The user can stop the translation process.
9. The MVP requires no Python, Docker, WSL2, local server, or cloud ASR.
