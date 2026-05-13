# AGENTS.md — Agent Workflow Contract

> This document defines how coding agents must work in this repository.
> `target.md` is the product contract. `implementation.md` is the engineering contract.
> Agents must read all three documents before making changes.

---

## 1. Primary Principles

1. **`target.md` is the source of truth for product scope.**
   - Feature boundaries, supported languages, product behavior, and non-goals are defined there.
   - Do not add features outside `target.md`.

2. **`implementation.md` is the source of truth for engineering shape.**
   - File paths, package boundaries, interfaces, and phase deliverables are defined there.
   - Do not invent alternate project structure without user approval.

3. **Mock first, real implementation second.**
   - Every major module must have a mock implementation before the real implementation.
   - The mock pipeline must run end-to-end before real ASR or real LLM integration.

4. **Small changes only.**
   - Complete one phase or one clearly scoped task at a time.
   - Do not implement future features “just in case.”

5. **Validate after every meaningful change.**
   - Run the relevant build/typecheck/test command.
   - Do not report success if validation fails.

---

## 2. MVP Hard Constraints

The MVP supports only:

### Source languages

| Language | Code |
|---|---|
| Mandarin Chinese | `zh` |
| English | `en` |
| Japanese | `ja` |

### Target languages

| Language | Code |
|---|---|
| Simplified Chinese | `zh-CN` |
| English | `en` |

Default direction:

```text
ja -> zh-CN
```

The MVP must not implement:

- Automatic language detection
- Korean support
- Japanese output subtitles
- User glossary / terminology table
- Platform caption extraction
- Cloud ASR
- Local ASR server
- Docker / Python / WSL2 ASR
- Speaker diarization
- AI dubbing
- Subtitle export
- Account system
- Cloud sync
- Payment or subscription system

Do not add placeholders, enum values, TODOs, routes, feature flags, UI controls, or hidden configuration for these deferred features.

---

## 3. Required Task Workflow

Agents must follow this workflow for every task.

```text
Step 1. Understand
  - Read target.md and implementation.md.
  - Locate the phase or feature being requested.
  - If the user request conflicts with target.md, state the conflict.

Step 2. Scope
  - List files to be added / modified / removed.
  - Confirm the change stays within MVP language and feature scope.
  - Ask if the task requires scope expansion.

Step 3. Implement
  - Make the smallest working change.
  - Keep reusable logic outside Chrome-specific modules.
  - Follow provider interfaces and dependency injection.

Step 4. Validate
  - Run relevant commands.
  - Fix failures within the current scope.
  - If blocked, stop and report the blocker.

Step 5. Report
  - List changed files.
  - Summarize what was implemented.
  - Include validation commands and results.
  - State remaining work.
```

---

## 4. Coding Constraints

### 4.1 TypeScript

- Use TypeScript everywhere.
- Enable strict mode.
- Do not use `any`.
- Use `unknown` plus type narrowing when necessary.
- Use `async/await` instead of `.then().catch()` chains.
- Keep modules small and readable.

### 4.2 Language Types

- All language codes must come from `packages/shared`.
- Do not duplicate `SourceLanguage` or `TargetLanguage` definitions.
- Do not scatter raw language string literals across business logic.
- Do not add unsupported language codes such as `ko`, `fr`, `de`, etc.

Allowed language codes:

```ts
type SourceLanguage = 'zh' | 'en' | 'ja';
type TargetLanguage = 'zh-CN' | 'en';
```

### 4.3 API Key Safety

API keys may exist only in:

- User-entered runtime UI state
- `chrome.storage.local` in the extension
- `.env.local` for local web-demo development, if needed, and only if ignored by Git

API keys must never be:

- Hardcoded in source files
- Hardcoded in tests
- Committed in config files
- Printed with `console.log`
- Included in debug panels
- Included in error messages

### 4.4 Provider Architecture

ASR implementations must implement `ASRProvider`.

Translator implementations must implement `TranslatorProvider`.

The pipeline must receive providers via dependency injection.

Forbidden:

```ts
// Forbidden inside Pipeline
new BrowserASRProvider()
new OpenAICompatibleTranslator()
```

Allowed:

```ts
new Pipeline({
  asrProvider,
  translatorProvider,
  settings,
});
```

### 4.5 Mock Providers

Mock providers must:

- Be implemented before real providers
- Not call network APIs
- Not load WASM
- Not depend on Chrome APIs
- Cover all supported language values
- Be usable in tests and the web demo

Mock providers should not be imported by production extension runtime unless explicitly selected for development.

### 4.6 Chrome Extension Rules

- Use Manifest V3.
- `chrome.tabCapture` must run from the offscreen document path.
- Popup must not perform ASR or translation.
- Content script must only render overlay UI and receive subtitle messages.
- Background service worker coordinates lifecycle and message routing.
- Runtime messages must go through `src/background/messageRouter.ts` or equivalent central routing.
- Extension settings must use `chrome.storage.local`.

### 4.7 Error Handling

- Network requests must use `try/catch`.
- ASR model loading must use `try/catch`.
- WASM / Web Worker calls must report readable errors.
- Errors must propagate to UI in a user-readable way.
- Do not swallow failures silently.

---

## 5. File Operation Rules

### Allowed code directories

| Path | Permission | Purpose |
|---|---|---|
| `apps/web-demo/` | read/write | Web demo |
| `apps/extension/` | read/write | Chrome extension |
| `packages/shared/` | read/write | Shared types and constants only |
| `packages/core/` | read/write | Pipeline |
| `packages/asr-browser/` | read/write | Browser ASR providers |
| `packages/translator/` | read/write | Translator providers |
| `packages/subtitle/` | read/write | Subtitle state/timing |

### Markdown documents

Agents may read:

- `AGENTS.md`
- `target.md`
- `implementation.md`

Agents must not modify them unless the user explicitly asks to update project specs.

### Forbidden file operations

- Do not delete existing `index.ts` files without updating imports.
- Do not place runtime logic in `packages/shared` except simple constants.
- Do not move Chrome-specific code into `packages/core`.
- Do not move browser ASR implementation into the translator package.
- Do not add backend/server directories during MVP.

---

## 6. Validation Commands

Use the available commands. If a command does not exist yet, state that clearly.

```bash
# repository-wide
pnpm install
pnpm build
pnpm typecheck
pnpm lint
pnpm test

# web demo
pnpm --filter web-demo dev
pnpm --filter web-demo build

# shared/core packages
pnpm --filter shared build
pnpm --filter core test

# translator package
pnpm --filter translator test

# ASR package
pnpm --filter asr-browser test

# extension
pnpm --filter extension build
```

If the project uses different script names, prefer existing scripts over inventing new ones.

---

## 7. Phase Checklists

### Phase 0 — Infrastructure

Before reporting complete:

- [ ] pnpm workspace exists
- [ ] root `tsconfig.base.json` exists
- [ ] package-level tsconfig files inherit root config
- [ ] `packages/shared` defines language/settings/audio/asr/translation/subtitle types
- [ ] `pnpm build` or equivalent passes

### Phase 1 — Mock Pipeline + Web Demo

Before reporting complete:

- [ ] `MockASRProvider` covers `zh`, `en`, `ja`
- [ ] `MockTranslator` covers `zh-CN`, `en`
- [ ] Core pipeline uses dependency injection
- [ ] Web demo can run mock pipeline end-to-end
- [ ] No API key is needed for mock mode
- [ ] No network dependency exists in mock mode

### Phase 2 — OpenAI-compatible Translator

Before reporting complete:

- [ ] `OpenAICompatibleTranslator` implements `TranslatorProvider`
- [ ] Prompt is centralized in `prompt.ts`
- [ ] User supplies Base URL, API Key, and Model Name
- [ ] API key is not hardcoded or logged
- [ ] Network failures return readable UI errors
- [ ] Translation supports only `zh-CN` and `en` targets

### Phase 3 — Browser ASR

Before reporting complete:

- [ ] `BrowserASRProvider` implements `ASRProvider`
- [ ] Model runs in Web Worker or otherwise does not block the main UI
- [ ] Source language parameter is passed to ASR
- [ ] Uploaded audio works in web demo
- [ ] At least `en` and `ja` are manually verified
- [ ] Mock and real ASR are interchangeable

### Phase 4 — Chrome Extension Skeleton

Before reporting complete:

- [ ] Manifest V3 configured
- [ ] Popup opens
- [ ] Options page saves settings
- [ ] Content script injects overlay
- [ ] Fake subtitle can render on a page

### Phase 5 — Tab Audio Capture

Before reporting complete:

- [ ] `chrome.tabCapture` runs from offscreen document
- [ ] User still hears tab audio
- [ ] AudioWorklet emits chunks
- [ ] Debug logs confirm audio chunk flow

### Phase 6 — Full MVP

Before reporting complete:

- [ ] Twitch / YouTube page can start translation
- [ ] Tab audio reaches browser ASR
- [ ] ASR output reaches translator
- [ ] Translated subtitles reach overlay
- [ ] Stop releases resources
- [ ] No Python / Docker / local server / cloud ASR is required

---

## 8. Blocker Protocol

Stop and ask the user when any of the following occurs:

1. The request conflicts with `target.md`.
2. The request requires adding a deferred feature.
3. ASR library choice requires a major architecture tradeoff.
4. Shared type definitions need breaking changes.
5. Pipeline interface needs breaking changes.
6. A validation command fails more than three times.
7. A required dependency is no longer maintained or cannot run in browser.
8. A requested change requires modifying `AGENTS.md`, `target.md`, or `implementation.md`.

Use this format:

```text
[BLOCKED]
Problem:
What I tried:
Decision needed:
```

---

## 9. Forbidden Behaviors

Never:

- Hardcode a real API key
- Print a user API key
- Add unsupported languages
- Add a glossary feature in MVP
- Add local server or cloud ASR in MVP
- Add TODOs for out-of-scope features
- Bypass provider interfaces
- Put ASR/translation inside content script
- Claim success without validation
- Modify project spec documents without explicit instruction

---

## 10. Required Completion Report

Every task completion must include:

```text
Changed files:
- ...

Implemented:
- ...

Validation:
- Command: ...
- Result: ...

Notes / Remaining work:
- ...
```

Do not claim that manual browser behavior was verified unless it was actually tested.

---

## 11. Multi-Mode Debug and Release Policy

The repository keeps both mock and real providers during debug and validation stages.

### 11.1 Debug-stage provider policy

During web-demo and integration debugging, the project may expose explicit mode selection for both ASR and Translator providers.

Allowed provider modes:

- ASR:
  - `MockASRProvider`
  - `BrowserASRProvider`

- Translator:
  - `MockTranslator`
  - `OpenAICompatibleTranslator`

Agents may implement explicit mode selection in debug-stage UI when needed to validate phase boundaries, isolate failures, or compare provider behavior.

This creates four valid debug-stage combinations:

- Mock ASR + Mock Translator
- Mock ASR + OpenAI-compatible Translator
- Browser ASR + Mock Translator
- Browser ASR + OpenAI-compatible Translator

The purpose of these combinations is validation and fault isolation only.
They must not expand product scope beyond the MVP defined in `target.md`.

### 11.2 Isolation requirements

When multiple modes exist:

1. Provider selection must remain explicit.
2. Provider composition must still go through the shared provider interfaces.
3. `Pipeline` must continue to receive providers through dependency injection.
4. Mock and real providers must remain swappable without changing pipeline internals.
5. Mock providers must stay usable for tests and regression checks.
6. API keys must only be required when the real translator mode is selected.
7. No mock-only behavior may leak into the final production extension runtime unless explicitly enabled for development.

### 11.3 Phase interpretation rule

If a later phase introduces a real provider that would otherwise replace a mock provider from an earlier phase, agents must preserve the earlier mock provider path when the user explicitly requests continued debug comparability.

In that case:

- phase validation may be satisfied by adding selectable provider modes rather than deleting the earlier mock path
- agents must report any resulting UI or architecture complexity before implementation if the change affects current phase boundaries

### 11.4 Release branch cleanup rule

Before final MVP release, extension-focused delivery must produce a clean real-provider branch or equivalent clean copy.

Release-cleanup requirements:

1. Remove debug-only mock selection from the production extension path.
2. Remove test-only mock runtime wiring from the production extension path.
3. Keep only the real MVP chain for shipped extension behavior:
   - browser tab audio
   - real browser ASR
   - real OpenAI-compatible translator
   - real subtitle overlay
4. Mock providers may remain in the repository for tests and development, but must not remain user-selectable in the production extension build unless the user explicitly requests a development build.
5. When this cleanup is performed, agents should create either:
   - a dedicated branch for release cleanup, or
   - a separate clean copy, if the user explicitly requests that workflow

### 11.5 Conflict rule

If an existing phase description conflicts with the debug-stage multi-mode policy above, agents must stop and ask the user whether to prioritize:

- strict single-path phase replacement, or
- debug-stage multi-mode preservation

Do not resolve that conflict silently.
