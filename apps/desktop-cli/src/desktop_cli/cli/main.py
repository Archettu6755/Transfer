"""desktop-cli command entrypoint."""

from __future__ import annotations

import sys
from collections.abc import Sequence

from desktop_cli.cli.audio_input_demo import run_audio_input_demo
from desktop_cli.cli.overlay_demo import run_overlay_demo
from desktop_cli.cli.session_demo import run_session_demo


def main(argv: Sequence[str] | None = None) -> int:
    """Run the local desktop subtitle CLI entrypoint."""

    args = list(argv) if argv is not None else sys.argv[1:]
    if args and args[0] == "overlay-demo":
        try:
            return run_overlay_demo(args[1:])
        except RuntimeError as exc:
            print(f"overlay-demo failed: {exc}")
            return 1
    if args and args[0] == "audio-input-demo":
        try:
            return run_audio_input_demo(args[1:])
        except RuntimeError as exc:
            print(f"audio-input-demo failed: {exc}")
            return 1
    if args and args[0] == "session-demo":
        try:
            return run_session_demo(args[1:])
        except RuntimeError as exc:
            print(f"session-demo failed: {exc}")
            return 1

    print("desktop-cli scaffold")
    print("Direction: ja -> zh-CN")
    print("Available commands: overlay-demo, audio-input-demo, session-demo")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
