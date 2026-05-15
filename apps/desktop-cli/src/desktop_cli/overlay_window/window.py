"""PySide6 overlay window implementation."""

from __future__ import annotations

from dataclasses import dataclass

from .models import OverlaySubtitleState

try:
    from PySide6.QtCore import Qt
    from PySide6.QtGui import QColor
    from PySide6.QtWidgets import QApplication, QLabel, QVBoxLayout, QWidget
except ImportError as exc:  # pragma: no cover - exercised manually
    QApplication = None  # type: ignore[assignment]
    QLabel = None  # type: ignore[assignment]
    QVBoxLayout = None  # type: ignore[assignment]
    QWidget = object  # type: ignore[assignment]
    Qt = None  # type: ignore[assignment]
    QColor = None  # type: ignore[assignment]
    _PYSIDE_IMPORT_ERROR = exc
else:
    _PYSIDE_IMPORT_ERROR = None


def ensure_pyside6_available() -> None:
    """Raise a readable error when PySide6 is not available locally."""

    if _PYSIDE_IMPORT_ERROR is not None:
        raise RuntimeError(
            "PySide6 or its Qt runtime could not be loaded on this workstation. "
            "Install and validate desktop-cli GUI dependencies before running overlay-demo."
        ) from _PYSIDE_IMPORT_ERROR


@dataclass(slots=True)
class OverlayWindowStyle:
    """Computed style values derived from the current subtitle state."""

    font_family: str
    font_size: int
    background_rgba: str


class OverlayWindow(QWidget):  # type: ignore[misc]
    """Minimal always-on-top overlay window for latest subtitle display."""

    def __init__(self) -> None:
        ensure_pyside6_available()
        super().__init__()
        self._state = OverlaySubtitleState()
        self._source_label = QLabel("")
        self._translated_label = QLabel("")
        self._setup_window()
        self._setup_layout()
        self.clear()

    def _setup_window(self) -> None:
        self.setWindowTitle("desktop-cli overlay")
        self.setAttribute(Qt.WidgetAttribute.WA_TranslucentBackground, True)
        self.setWindowFlags(
            Qt.WindowType.FramelessWindowHint
            | Qt.WindowType.WindowStaysOnTopHint
            | Qt.WindowType.Tool
        )
        self.resize(960, 180)

    def _setup_layout(self) -> None:
        layout = QVBoxLayout()
        layout.setContentsMargins(24, 16, 24, 16)
        layout.setSpacing(8)

        for label in (self._source_label, self._translated_label):
            label.setWordWrap(True)
            label.setAlignment(
                Qt.AlignmentFlag.AlignHCenter | Qt.AlignmentFlag.AlignVCenter
            )

        layout.addWidget(self._source_label)
        layout.addWidget(self._translated_label)
        self.setLayout(layout)

    def update_state(self, state: OverlaySubtitleState) -> None:
        self._state = state
        style = self._build_style(state)
        self._source_label.setVisible(state.show_source_text and bool(state.source_text))
        self._source_label.setText(state.source_text)
        self._translated_label.setText(state.translated_text)

        common_style = (
            f"color: white;"
            f"font-family: \"{style.font_family}\";"
            f"font-size: {style.font_size}px;"
            "padding: 0;"
        )
        self._source_label.setStyleSheet(common_style + "font-weight: 500;")
        self._translated_label.setStyleSheet(common_style + "font-weight: 700;")
        self.setStyleSheet(
            "QWidget {"
            f"background-color: {style.background_rgba};"
            "border-radius: 18px;"
            "}"
        )
        self._reposition(state.overlay_position)
        if state.visible:
            self.show()
        else:
            self.hide()

    def hide_overlay(self) -> None:
        self.hide()

    def clear(self) -> None:
        self._source_label.setText("")
        self._translated_label.setText("")
        self.hide()

    def _build_style(self, state: OverlaySubtitleState) -> OverlayWindowStyle:
        opacity = max(0.0, min(1.0, state.background_opacity))
        alpha = int(opacity * 255)
        color = QColor(18, 18, 18, alpha)
        return OverlayWindowStyle(
            font_family=state.font_family,
            font_size=state.font_size,
            background_rgba=color.name(QColor.NameFormat.HexArgb),
        )

    def _reposition(self, overlay_position: str) -> None:
        screen = QApplication.primaryScreen()
        if screen is None:
            return

        geometry = screen.availableGeometry()
        x = geometry.x() + max(0, (geometry.width() - self.width()) // 2)
        if overlay_position == "top":
            y = geometry.y() + 40
        else:
            y = geometry.y() + geometry.height() - self.height() - 60
        self.move(x, y)
