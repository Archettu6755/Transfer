# target.md — Product Target

> This document defines what the product should become.
> It describes product scope, user-facing behavior, supported languages, UI shape, and non-goals.
> Implementation details belong in `implementation.md`.

---

## 1. Product Positioning

Build a Windows-first local desktop subtitle tool for Japanese VTuber livestream translation into Simplified Chinese.

The MVP runs as a local Python CLI workflow, connects to an `anime-whisper` runtime running through Docker or docker-compose, translates final Japanese transcript through a user-provided OpenAI-compatible LLM API, and renders subtitles in a local overlay window.

Core value:

- **Local-first ASR:** no cloud ASR is required.
- **User-owned LLM credentials:** the user enters their own API Base URL, API Key, and Model Name.
- **Composable architecture:** audio input, runtime client, translator, subtitle controller, and overlay window remain separated.
- **Practical local UX:** the product is a local tool, not a browser extension.

Core product flow:

```text
Live audio
  -> local anime-whisper runtime
  -> final Japanese text
  -> OpenAI-compatible LLM translation
  -> latest Chinese subtitle in a local overlay window
```

---

## 2. MVP Language Scope

### 2.1 Source language

| Display name | Code |
|---|---|
| Japanese | `ja` |

Fixed:

```text
sourceLang = ja
```

### 2.2 Target language

| Display name | Code |
|---|---|
| Simplified Chinese | `zh-CN` |

Fixed:

```text
targetLang = zh-CN
```

### 2.3 Supported direction

The only supported direction is:

```text
Japanese audio -> Simplified Chinese subtitles
```

---

## 3. Product Scope

### 3.1 Local CLI Product

The final MVP product is a local desktop workflow.

The product should provide:

- CLI startup
- Local runtime status and readable error reporting
- Live audio input
- Local Docker or docker-compose `anime-whisper` integration
- OpenAI-compatible LLM translation
- Local overlay subtitle window

### 3.2 Web Demo

The repository may keep a web demo, but only as a development and validation tool.

Purpose:

- Validate the pipeline without live-audio complexity
- Test mock ASR and mock translation
- Test OpenAI-compatible translation
- Test file-based `anime-whisper` client integration

The web demo should include:

- Audio file uploader
- LLM settings form
- Provider preset selector for OpenAI-compatible endpoints
- Subtitle preview
- Debug panel

The web demo is not the final product delivery form.

---

## 4. User-facing Features

### 4.1 CLI Start / Stop

The local product must provide:

- A start command or equivalent CLI entrypoint
- A stop path or equivalent lifecycle cleanup
- Current status output
- Fixed language direction (`ja -> zh-CN`)

Start should begin the local subtitle pipeline.

Stop should stop audio capture or processing, stop ASR and translation work, and clean up resources.

### 4.2 Local Configuration

The product must allow the user to configure:

- Provider preset for supported OpenAI-compatible services
- API Base URL
- API Key
- Model Name
- Show source text on subtitle overlay
- Font size
- Overlay position
- Background opacity

Configuration must stay local.

The MVP does not require a user-facing runtime endpoint editor unless the product scope is explicitly expanded later.

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

### 4.4 Subtitle Overlay Window

The subtitle UI must be a local overlay window.

Minimum behavior:

- Show the latest translated subtitle text
- Optionally show source text
- Default to bottom placement
- Use readable font size
- Use a semi-transparent background
- Avoid covering too much of the screen
- Support basic style settings
- Use basic text wrapping only

The MVP does not include rolling history, formal bilingual mode, or advanced multi-line layout logic.

### 4.5 Debug Information

The product should expose basic debug information to help troubleshoot early builds.

Useful fields:

- Fixed source language (`ja`)
- Fixed target language (`zh-CN`)
- Runtime client state
- Translator client state
- Last ASR text
- Last translated text
- Audio input state
- Last error

This can be simple and developer-oriented in the MVP.

---

## 5. Product Non-goals for MVP

The following must not appear in MVP UI, settings, hidden flags, TODOs, or pre-created extension points unless the user explicitly updates scope:

- Automatic language detection
- Korean recognition or output
- Japanese subtitle output
- Cloud ASR
- Browser extension delivery
- Browser page-injected subtitle overlay
- LLM correction before translation
- User glossary / terminology table
- Terminology / glossary injection
- Incremental subtitle updates
- Formal bilingual subtitle mode
- Rolling subtitle history
- Advanced multi-line subtitle layout behavior
- Speaker diarization
- AI dubbing
- Subtitle export
- Account system
- Cloud sync
- Payment system

---

## 6. UX Principles

The MVP should feel:

- Local-first
- Practical
- Easy to start and stop
- Clear when errors occur
- Lightweight in presentation

It should not feel like a browser plugin or a full translation platform.

The first product milestone is only to prove the local subtitle loop with `anime-whisper` and OpenAI-compatible translation.

---

## 7. Post-MVP / V2 Enhancements

The following are accepted future directions, but are not part of the current MVP:

- LLM correction of ASR text before translation
- Terminology / glossary injection for translation consistency
- Incremental subtitle updates driven by partial transcript events
- Formal bilingual subtitle mode
- Rolling subtitle history
- Advanced multi-line subtitle layout behavior

These items must not be treated as current MVP acceptance criteria.

---

## 8. MVP Acceptance Criteria

The MVP is complete when:

1. The local CLI can start.
2. The user can configure API Base URL, API Key, and Model Name, either manually or through a provider preset that auto-fills recommended values.
3. The application can connect to the local `anime-whisper` runtime.
4. Live audio can be processed into final Japanese source-language text.
5. The translator converts source text into `zh-CN`.
6. The local overlay window displays the latest translated subtitle.
7. The user can stop the translation process.
8. The MVP requires no cloud ASR, but does require a local Docker or docker-compose `anime-whisper` runtime.
