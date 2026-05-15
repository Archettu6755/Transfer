"""Help text for the desktop-cli product and dev commands."""

from __future__ import annotations


def build_help_text(*, include_dev: bool = False) -> str:
    lines = [
        "desktop-cli",
        "Direction: ja -> zh-CN",
        "",
        "User commands:",
        "  init   Initialize local provider, model, API key, and display settings",
        "  start  Start the local subtitle workflow",
        "",
        "Common usage:",
        "  desktop-cli init",
        "  desktop-cli",
        "  desktop-cli start --provider glm --model GLM-4.7-FlashX",
        "  desktop-cli start --font \"Microsoft YaHei\" --font-size 36 --bg 0.6 --source-text",
        "",
        "Notes:",
        "  desktop-cli without a subcommand is the same as desktop-cli start",
        "  Run 'desktop-cli help --dev' to see development and validation commands",
    ]

    if include_dev:
        lines.extend(
            [
                "",
                "Development commands:",
                "  overlay-demo      Test the local overlay window only",
                "  audio-input-demo  Test the audio input boundary only",
                "  session-demo      Run the internal development session pipeline",
            ]
        )

    return "\n".join(lines)
