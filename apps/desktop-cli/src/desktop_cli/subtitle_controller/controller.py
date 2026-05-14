"""Phase 1 subtitle controller boundary."""

from __future__ import annotations

from dataclasses import dataclass


@dataclass(slots=True)
class SubtitleController:
    """Placeholder controller boundary for later phases.

    Phase 1 only establishes that the local desktop product will have a
    dedicated control layer between runtime input, translation, and subtitle UI.
    """

    name: str = "subtitle-controller"
