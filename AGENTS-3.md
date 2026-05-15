# AGENTS-3.md — Docker-capable Environment Constraint

This file defines constraints for a Docker / WSL2 capable workstation.
It is mutually exclusive with `AGENTS-2.md` — only one applies at a time.

## Local ASR Runtime Permission

- This workstation supports Docker and WSL2.
- `anime-whisper` runtime development, building, containerized services,
  end-to-end validation, and live-audio verification are **permitted**.

Allowed on this machine:

- All work permitted in `AGENTS-2.md`
- Building Docker images for `anime-whisper`
- Running containerized `anime-whisper` services
- WSL2 runtime debugging for `anime-whisper`
- Real local-ASR end-to-end validation against `anime-whisper`
- Live-audio-to-runtime verification

Blocked on this machine:

- None within MVP scope.
