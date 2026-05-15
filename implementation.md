# implementation.md — Engineering Implementation Contract

> This document defines how to build the product described in `target.md`.
> It contains the required technical stack, package structure, core interfaces, provider requirements, implementation phases, and validation rules.

---

## 1. Technical Stack

Required:

- Python
- PySide6
- Docker / docker-compose
- `anime-whisper`
- OpenAI-compatible translator client

MVP must not use:

- Cloud ASR
- Browser-extension runtime as the main product path
- Browser page-injected overlay as the main subtitle path

The repository remains local-first.
The `anime-whisper` runtime is an external runtime dependency, not a reason to move all product logic into the runtime container.

---

## 2. Repository Structure

Use this structure as the target architecture:

```text
browser-live-translator/
  AGENTS.md
  AGENTS-2.md
  target.md
  implementation.md

  apps/
    desktop-cli/
      pyproject.toml
      src/
        cli/
        audio_input/
        runtime_client/
        translator_client/
        subtitle_controller/
        overlay_window/
        config/
        tests/

    web-demo/
      package.json
      index.html
      vite.config.ts
      src/
        App.tsx
        components/
          AudioUploader.tsx
          SettingsPanel.tsx
          SubtitlePreview.tsx
          DebugPanel.tsx

  packages/
    shared/
    core/
    asr-local/
    translator/
    subtitle/
```

Rules:

- `apps/desktop-cli/` becomes the main product path.
- `apps/web-demo/` remains a development and validation tool only.
- Existing browser-extension code is no longer the target architecture.

---

## 3. Architectural Boundaries

The product must keep these responsibilities separated:

- `audio_input`
- `runtime_client`
- `translator_client`
- `subtitle_controller`
- `overlay_window`

It must not collapse them into one large script.

### 3.1 Runtime model

The real ASR target is `anime-whisper`.

Rules:

- The runtime is external and runs through Docker or docker-compose.
- Repository code talks to the runtime through a client boundary.
- The runtime implementation itself is not the main product code.

### 3.2 Subtitle model

Current MVP subtitle behavior is fixed:

- final transcript only
- latest single subtitle only
- translated text first
- optional source text
- basic wrapping only

Do not implement rolling history, formal bilingual mode, or incremental subtitle UI in MVP.

### 3.3 Web demo role

The web demo exists only for file-based validation of:

- `anime-whisper` client integration
- translation behavior
- subtitle text behavior

It is not the final delivery form.

---

## 4. Core Interfaces

The exact code can differ, but the architecture must expose clear boundaries for:

- runtime transcript events
- translator requests
- subtitle display state
- lifecycle control

Recommended event model:

```text
final_transcript_received
translation_succeeded
translation_failed
session_stopped
session_failed
```

Recommended controller responsibility:

- receive final transcript
- call translator
- update subtitle state
- update overlay window
- handle stop cleanup

Recommended stop behavior:

- stop audio input
- stop runtime session
- stop translation work
- clear subtitle state
- hide or reset overlay window

---

## 5. Runtime Client

Target path:

```text
apps/desktop-cli/src/runtime_client/
packages/asr-local/
```

Required behavior:

- Connect to a local `anime-whisper` runtime or a thin wrapper service in front of it
- Accept fixed source language `ja`
- Support file-based validation first
- Later support live audio input
- Return stable final text for MVP
- Surface readable connection and runtime errors

Required design rules:

- The client is a Python or repository-local client layer, not the runtime itself
- The client must remain swappable with mock or validation paths
- The client must not bake UI logic into the runtime boundary

If direct `anime-whisper` integration is awkward, a thin wrapper service may normalize the runtime interface, but the product-side client contract must stay stable.

---

## 6. Translator Client

Target path:

```text
apps/desktop-cli/src/translator_client/
packages/translator/
```

Required behavior:

- Use OpenAI-compatible Chat Completions
- Use user-provided Provider, API Key, and Model Name
- Support timeout
- Return readable errors
- Never log API key
- Translate only into `zh-CN`
- Consume only final Japanese transcript in MVP

The prompt layer may remain centralized, but must reflect the fixed `ja -> zh-CN` direction.
The local CLI product path may derive `api_base_url` internally from a canonical provider mapping and must not expose `api_base_url` as a user-facing CLI input.

---

## 7. Overlay Window

Target path:

```text
apps/desktop-cli/src/overlay_window/
```

Required behavior:

- Create a local overlay window using PySide6
- Render the latest subtitle
- Optionally render the source text
- Support basic style settings
- Support hide and cleanup

Recommended window characteristics:

- frameless
- transparent background
- always-on-top
- bottom-aligned by default

The overlay window must not directly call the runtime or translator.

---

## 8. Audio Input

Target path:

```text
apps/desktop-cli/src/audio_input/
```

The product should support two conceptual input modes:

- `file`
- `live_audio`

Rules:

- `file` is the validation path
- `live_audio` is the real product path
- the controller and runtime client must not depend on a single hardcoded input source

The MVP product target is live audio, but file-based validation is required earlier in the phase order.

---

## 9. Configuration

The local product must support configuration for:

- provider
- API Key
- Model Name
- show source text
- font size
- overlay position
- background opacity

The MVP does not require a user-facing editor for runtime endpoints. `api_base_url` may remain an internal derived field.

Configuration must stay local and must not be committed.

---

## 10. Implementation Phases

### Phase 0 — Python Infrastructure

Deliver:

- Python project scaffolding
- CLI entrypoint
- config structure
- local module layout

Validate:

```bash
pnpm build
pnpm typecheck
```

Use actual Python validation commands once the project adds them.

### Phase 1 — Mock Pipeline + File Validation

Deliver:

- Mock ASR path
- Mock translator path
- File-based validation flow
- Subtitle controller skeleton

Validate:

```bash
pnpm --filter core test
pnpm --filter web-demo dev
```

### Phase 2 — OpenAI-compatible Translator

Deliver:

- Prompt builder
- OpenAI-compatible translator
- LLM settings handling
- Provider normalization and internal endpoint mapping
- Error display

Validate:

```bash
pnpm --filter translator test
pnpm --filter web-demo dev
```

### Phase 3 — anime-whisper Client + File Input

Deliver:

- `anime-whisper` client
- File input decode path
- Final transcript -> translation -> preview flow

Validate:

```bash
pnpm --filter asr-local test
pnpm --filter web-demo dev
```

Manual validation:

- Validate Japanese audio file flow in an ASR-capable environment

### Phase 4 — Local Overlay Window

Deliver:

- PySide6 overlay window
- Latest subtitle rendering
- Optional source text rendering
- Basic wrapping
- Hide and cleanup behavior

Manual validation:

- Start local UI shell
- Inject test subtitle
- Confirm latest subtitle display
- Confirm hide and cleanup

### Phase 5 — Live Audio Input

Deliver:

- Live audio input path
- Audio event handoff to runtime client
- Readable audio input errors

Manual validation:

- Start live audio session
- Confirm audio reaches runtime-client boundary
- Confirm runtime or input errors are readable

### Phase 6 — Full Local CLI + Docker Compose Loop

Deliver:

- CLI session startup
- Live audio -> `anime-whisper`
- Final transcript -> translator
- Translation -> local overlay window
- Stop cleanup

Manual validation:

```text
Start the local CLI
  -> Start a session
  -> Capture live audio
  -> Send audio to local anime-whisper runtime
  -> Receive final Japanese transcript
  -> Translate into zh-CN
  -> Display latest subtitle in the local overlay window
  -> Stop
  -> Processing stops and resources are released
```

---

## 11. Deferred V2 Enhancements

The following ideas are accepted future directions, but are not part of the current implementation scope:

- LLM correction before translation
- Terminology / glossary injection
- Incremental subtitles driven by partial transcript events
- Formal bilingual subtitle mode
- Rolling subtitle history
- Advanced multi-line subtitle layout behavior

The current MVP architecture should leave room for these later, but must not implement them now.

For the current MVP, subtitle behavior remains:

- final transcript only
- latest single subtitle only
- `ja -> zh-CN` only
- `anime-whisper` as the real local-ASR target
