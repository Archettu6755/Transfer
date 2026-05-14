# AGENTS-2.md — Local Environment Constraint

This file defines one workstation-specific rule for this repository.

## Local ASR Runtime Restriction

- This workstation must not be used for local-ASR runtime development.
- Do not attempt to develop, run, debug, or validate Docker-based or WSL2-based `anime-whisper` runtime work on this machine.
- Do not claim local-ASR manual verification from this machine.
- `anime-whisper` runtime work will be migrated to another environment that actually provides Docker and WSL2 support.

Allowed on this machine:

- Specification updates
- Shared type changes
- Pipeline and translator work
- Python CLI structure work
- Local overlay window work that does not require a live runtime
- WebSocket/protocol/client integration work for `anime-whisper`
- Web-demo file-input validation work that does not require a live local-ASR runtime
- Mock-provider work

Blocked on this machine unless the user explicitly redirects the task to another environment:

- Building Docker images for `anime-whisper`
- Running containerized `anime-whisper` services
- WSL2 runtime debugging for `anime-whisper`
- Real local-ASR end-to-end validation against `anime-whisper`
- Live-audio-to-runtime verification that depends on the real runtime
