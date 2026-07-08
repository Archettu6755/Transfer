# desktop-cli

Local Python CLI for the desktop subtitle product.

Current scope:

- `init` stores local provider, model, API key environment variable, and display settings
- `start` runs the formal local workflow with fixed `ja -> zh-CN`
- mock and anime-whisper runtime clients
- mock and OpenAI-compatible translator clients
- local PySide6 overlay window
- test-tone and WASAPI loopback audio input boundaries

Development commands:

- `overlay-demo`
- `audio-input-demo`
- `session-demo`
