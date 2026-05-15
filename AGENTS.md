# AGENTS.md — Agent Workflow Contract

> This document defines how coding agents must work in this repository.
> `AGENTS-2.md` and `AGENTS-3.md` are the local-environment execution
> contracts. They are mutually exclusive — read both, but only apply
> the one that matches the current workstation. If uncertain which
> applies, ask the user.
> `target.md` is the product contract. `implementation.md` is the engineering contract.
> Agents must read all five documents before making changes.

---

## 1. Primary Principles

1. **`target.md` is the source of truth for product scope.**
   - Product shape, supported languages, user-facing behavior, and non-goals are defined there.
   - Do not add features outside `target.md`.

2. **`implementation.md` is the source of truth for engineering shape.**
   - Package boundaries, runtime responsibilities, module layout, and phase deliverables are defined there.
   - Do not invent a different architecture without user approval.

3. **`AGENTS-2.md` and `AGENTS-3.md` define the current workstation's execution limits.**
     They are mutually exclusive:
     - `AGENTS-2.md` — applies when Docker / WSL2 are NOT available
     - `AGENTS-3.md` — applies when Docker / WSL2 ARE available
   - The agent reads both, determines which applies (or asks the user), and follows only that one.
   - If a task conflicts with the active constraint file, stop and report it.

4. **Mock first, real implementation second.**
   - Every major module must have a mock or validation path before the real runtime path.
   - File-based and mocked validation must work before live-audio runtime integration.

5. **Small changes only.**
   - Complete one phase or one clearly scoped task at a time.
   - Do not implement future features “just in case.”

6. **Validate after every meaningful change.**
   - Run the relevant build/typecheck/test command.
   - Do not report success if validation fails.

---

## 2. MVP Hard Constraints

The MVP supports only:

### Source language

| Language | Code |
|---|---|
| Japanese | `ja` |

### Target language

| Language | Code |
|---|---|
| Simplified Chinese | `zh-CN` |

Only supported direction:

```text
ja -> zh-CN
```

The MVP must not implement:

- Automatic language detection
- Korean support
- Japanese output subtitles
- Cloud ASR
- Browser extension delivery
- Browser page-injected subtitle overlay
- LLM correction before translation
- User glossary / terminology table
- Terminology / glossary injection into prompts
- Incremental subtitle updates
- Formal bilingual subtitle mode
- Rolling subtitle history
- Advanced multi-line subtitle layout modes
- Speaker diarization
- AI dubbing
- Subtitle export
- Account system
- Cloud sync
- Payment or subscription system

Do not add placeholders, enum values, TODOs, routes, feature flags, UI controls, or hidden configuration for these deferred features.
Do not implement any V2 feature unless the user explicitly revises the project specification documents first.

---

## 3. Required Task Workflow

Agents must follow this workflow for every task.

```text
Step 1. Understand
  - Read AGENTS.md, AGENTS-2.md, AGENTS-3.md, target.md, and implementation.md.
  - Locate the phase or feature being requested.
  - If the user request conflicts with target.md, state the conflict.
  - If the task requires real anime-whisper runtime work on this machine, state the AGENTS-2.md conflict.

Step 2. Scope
  - List files to be added / modified / removed.
  - Confirm the change stays within MVP language and feature scope.
  - Ask if the task requires scope expansion.

Step 3. Implement
  - Make the smallest working change.
  - Keep UI, runtime-client, translator, and subtitle responsibilities separated.
  - Follow provider or client interfaces and dependency injection.

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

### 4.1 Primary Implementation Language

- The main product path is Python.
- The local desktop workflow must be built around Python CLI orchestration and a local overlay window.
- Existing TypeScript code may remain only where the product specs still allow it, such as the web demo validation tool.

### 4.2 Python

- Use Python 3.11+ unless the user explicitly changes the runtime target.
- Use type hints.
- Keep modules small and readable.
- Prefer dataclasses or small typed models for runtime events and subtitle state.
- Use `asyncio` where asynchronous runtime or translator coordination is required.

### 4.3 Language Types

- All product logic must treat the language direction as fixed.
- Do not reintroduce source-language or target-language selectors into the main product path.
- Do not add unsupported language codes such as `ko`, `en`, `zh`, `fr`, or `de`.

Allowed language codes:

```ts
type SourceLanguage = 'ja';
type TargetLanguage = 'zh-CN';
```

### 4.4 API Key Safety

API keys may exist only in:

- User-entered runtime UI state
- Local config or environment storage that is ignored by Git
- A local desktop settings store if the implementation later adds one

API keys must never be:

- Hardcoded in source files
- Hardcoded in tests
- Committed in config files
- Printed with `console.log`, `print`, or equivalent debug output
- Included in overlay text
- Included in raw error messages shown to users

Provider mappings may exist as a convenience layer for OpenAI-compatible services, but they must follow these rules:

- The local CLI product path may normalize provider aliases into a canonical provider id
- The local CLI product path may derive a fixed Base URL from the canonical provider
- API keys must remain user-provided and must never be bundled into provider definitions
- API keys may be persisted only in local environment storage such as a Git-ignored `.env` file
- The local CLI product path must not expose `api_base_url` as a user-facing input

### 4.5 Provider and Client Architecture

The real ASR target is `anime-whisper`, but the product code must still separate:

- audio input
- runtime client
- translator client
- subtitle controller
- overlay window

Forbidden:

```py
# Forbidden inside a controller or orchestration layer
from anime_whisper_runtime import EmbeddedRuntime
embedded_runtime = EmbeddedRuntime()
```

Allowed:

```py
controller = SubtitleController(
    runtime_client=runtime_client,
    translator_client=translator_client,
    overlay=overlay_window,
    settings=settings,
)
```

### 4.6 Mock and Validation Paths

Mock or validation paths must:

- Be implemented before the real runtime path is considered complete
- Not depend on Docker or WSL2
- Be usable in tests and the file-based validation flow
- Preserve the fixed `ja -> zh-CN` product direction

### 4.7 Overlay Window Rules

- The MVP subtitle UI is a local overlay window, not a browser page overlay.
- The overlay window must only render subtitle state and receive update events.
- The overlay window must not directly run ASR or translation.
- MVP behavior is fixed to:
  - final transcript only
  - latest single subtitle only
  - translated text first
  - optional source text
  - basic wrapping only

### 4.8 Error Handling

- Runtime client requests must use readable error handling.
- Translator requests must use readable error handling.
- Audio input failures must surface readable user errors.
- Errors must propagate to the CLI or local UI in a user-readable way.
- Do not swallow failures silently.

---

## 5. File Operation Rules

### Allowed code directories

| Path | Permission | Purpose |
|---|---|---|
| `apps/desktop-cli/` | read/write | Main local product path |
| `apps/web-demo/` | read/write | File-based validation tool |
| `packages/shared/` | read/write | Shared types and constants only |
| `packages/core/` | read/write | Pipeline or shared orchestration logic |
| `packages/asr-local/` | read/write | Local ASR client and protocol |
| `packages/translator/` | read/write | Translator client code |
| `packages/subtitle/` | read/write | Subtitle state and timing |

### Markdown documents

Agents may read:

- `AGENTS.md`
- `AGENTS-2.md`
- `AGENTS-3.md`
- `target.md`
- `implementation.md`

Agents must not modify them unless the user explicitly asks to update project specs.

### Forbidden file operations

- Do not place runtime UI logic in `packages/shared`.
- Do not move `anime-whisper` runtime implementation into repository-local product logic.
- Do not restore Chrome-extension runtime code as a primary delivery path.
- Do not place translator logic inside the overlay window module.

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

# web demo validation tool
pnpm --filter web-demo dev
pnpm --filter web-demo build

# shared/core packages
pnpm --filter shared build
pnpm --filter core test

# translator package
pnpm --filter translator test

# ASR package
pnpm --filter asr-local test
```

If the repository later adds Python-native commands, prefer the actual project scripts over inventing new ones.

---

## 7. Phase Checklists

### Phase 0 — Python Infrastructure

Before reporting complete:

- [ ] Main local product structure exists
- [ ] Python project configuration exists
- [ ] Shared type or event definitions exist where required
- [ ] `pnpm build` or equivalent validation passes for remaining repo-owned tooling

### Phase 1 — Mock Pipeline + File Validation

Before reporting complete:

- [ ] Mock ASR covers `ja`
- [ ] Mock translation covers `zh-CN`
- [ ] Core pipeline uses dependency injection
- [ ] File-based validation can run end-to-end
- [ ] No API key is needed for mock mode
- [ ] No network dependency exists in mock mode

### Phase 2 — OpenAI-compatible Translator

Before reporting complete:

- [ ] OpenAI-compatible translator implements the required translator interface
- [ ] Prompt logic is centralized
- [ ] User can supply Provider, API Key, and Model Name through the local CLI configuration flow
- [ ] API key is not hardcoded or logged
- [ ] Network failures return readable UI errors
- [ ] Translation supports only `zh-CN`

### Phase 3 — anime-whisper Client + File Input

Before reporting complete:

- [ ] Real local ASR integration targets `anime-whisper`
- [ ] Source language parameter is fixed to `ja`
- [ ] File-based validation works with the real runtime client shape
- [ ] Mock and real runtime-client paths are interchangeable at the orchestration boundary
- [ ] Manual real-runtime verification is performed only in an ASR-capable environment

### Phase 4 — Local Overlay Window

Before reporting complete:

- [ ] Local overlay window opens
- [ ] Latest subtitle can render
- [ ] Optional source text can render
- [ ] Basic wrapping works
- [ ] Hide and cleanup behavior works

### Phase 5 — Live Audio Input

Before reporting complete:

- [ ] Live audio input reaches the runtime client boundary
- [ ] User can still hear audio if the chosen capture strategy requires passthrough
- [ ] Debug logs confirm audio event flow
- [ ] Audio input failures surface readable errors

### Phase 6 — Full Local CLI Loop

Before reporting complete:

- [ ] CLI can start a session
- [ ] Live audio reaches the local `anime-whisper` runtime
- [ ] Final ASR output reaches translator
- [ ] Latest translated subtitle reaches the local overlay window
- [ ] Stop releases resources
- [ ] No cloud ASR is required

---

## 8. Blocker Protocol

Stop and ask the user when any of the following occurs:

1. The request conflicts with `target.md`.
2. The request requires adding a deferred feature.
3. Runtime choice requires a major architecture tradeoff.
4. Shared type definitions need breaking changes.
5. Pipeline or controller interfaces need breaking changes.
6. A validation command fails more than three times.
7. A required dependency is no longer maintained or cannot run in the target runtime environment.
8. A task requires real Docker/WSL2/`anime-whisper` runtime work that violates the active environment constraint file (`AGENTS-2.md` or `AGENTS-3.md`).
9. A requested change requires modifying `AGENTS.md`, `AGENTS-2.md`, `AGENTS-3.md`, `target.md`, or `implementation.md`.

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
- Implement deferred V2 features in this repository scope
- Add a glossary feature in MVP
- Add cloud ASR in MVP
- Restore browser-extension delivery as the primary product path
- Bypass provider or client interfaces
- Put ASR or translation logic inside the overlay window
- Claim success without validation
- Modify project spec documents without explicit instruction
- Claim real local-ASR validation from this machine

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

Do not claim that live runtime behavior was verified unless it was actually tested.

---

## 11. Web Demo Policy

The web demo remains in the repository only as a development and validation tool.

Rules:

1. It is not the final product form.
2. It must remain fixed to `ja -> zh-CN`.
3. It must support file-based validation.
4. It must not redefine the main product architecture.

## 12. V2 Deferral Rule

The following ideas are explicitly deferred to V2 and must not be implemented in the current MVP:

- LLM correction before translation
- Terminology / glossary injection
- Incremental subtitle updates
- Formal bilingual subtitle mode
- Rolling subtitle history
- Advanced multi-line subtitle layout modes

Current MVP subtitle behavior remains:

- `ja -> zh-CN` only
- `anime-whisper` as the real local-ASR target
- final transcript only
- latest single subtitle only
