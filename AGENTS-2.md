# AGENTS-2.md — Local Environment Constraint

This file defines one workstation-specific rule for this repository.

## Local ASR Runtime Restriction

- This workstation must not be used for local-ASR runtime development.
- Do not attempt to develop, run, debug, or validate Docker-based or WSL2-based ASR runtime work on this machine.
- Do not claim local-ASR manual verification from this machine.
- Local ASR runtime work will be migrated to another environment that actually provides Docker and WSL2 support.

Allowed on this machine:

- Specification updates
- Shared type changes
- Pipeline and translator work
- Web-demo and extension integration work that does not require a live local-ASR runtime
- Mock-provider work

Blocked on this machine unless the user explicitly redirects the task to another environment:

- Building Docker images for ASR
- Running containerized ASR services
- WSL2 runtime debugging
- Real local-ASR end-to-end validation
