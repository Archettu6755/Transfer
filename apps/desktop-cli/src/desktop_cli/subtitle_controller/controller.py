"""Phase 6 subtitle session orchestration."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Literal
from uuid import uuid4

from desktop_cli.audio_input import AudioInputSource
from desktop_cli.config import AppConfig
from desktop_cli.overlay_window import OverlayController
from desktop_cli.runtime_client import (
    CancelStreamRequest,
    FinalTranscriptEvent,
    FinishStreamRequest,
    RuntimeClient,
    RuntimeClientConfig,
    RuntimeEvent,
    StartStreamRequest,
    StreamFailedEvent,
)
from desktop_cli.translator_client import TranslationRequest, TranslatorClient

SessionStatus = Literal["idle", "starting", "running", "stopped", "error"]


@dataclass(slots=True)
class SubtitleSessionState:
    status: SessionStatus = "idle"
    runtime_mode: str = "fake"
    translator_mode: str = "mock"
    last_source_text: str = ""
    last_translated_text: str = ""
    last_error: str = ""


@dataclass(slots=True)
class SubtitleController:
    """Drive audio input, runtime, translation, and overlay updates."""

    runtime_client: RuntimeClient
    runtime_config: RuntimeClientConfig
    translator_client: TranslatorClient
    overlay_controller: OverlayController
    audio_input: AudioInputSource
    app_config: AppConfig
    sample_rate: int = 16_000
    stream_id: str = field(default_factory=lambda: uuid4().hex)
    state: SubtitleSessionState = field(default_factory=SubtitleSessionState)
    _stream_started: bool = field(default=False, init=False)
    _cleaned_up: bool = field(default=False, init=False)

    def __post_init__(self) -> None:
        self.state.runtime_mode = self.app_config.runtime_mode
        self.state.translator_mode = self.app_config.translator_mode

    async def run(self) -> SubtitleSessionState:
        self._cleaned_up = False
        self.state.status = "starting"
        self.state.last_error = ""
        try:
            await self.runtime_client.init(self.runtime_config)
            events = await self.runtime_client.start_stream(
                StartStreamRequest(
                    stream_id=self.stream_id,
                    source_lang="ja",
                    sample_rate=self.sample_rate,
                )
            )
            self._stream_started = True
            await self._handle_runtime_events(events)
            self.audio_input.start()
            self.state.status = "running"

            while True:
                chunk = self.audio_input.read_chunk()
                if chunk is None:
                    break
                events = await self.runtime_client.push_chunk(chunk)
                await self._handle_runtime_events(events)

            events = await self.runtime_client.finish_stream(
                FinishStreamRequest(stream_id=self.stream_id)
            )
            self._stream_started = False
            await self._handle_runtime_events(events)
            if self.state.status != "error":
                self.state.status = "stopped"
        except Exception as exc:
            self.state.status = "error"
            self.state.last_error = str(exc)
        finally:
            await self._cleanup(reset_state=False)

        return self.state

    async def stop(self) -> None:
        self.state.status = "stopped"
        await self._cleanup(reset_state=True)

    async def _handle_runtime_events(self, events: list[RuntimeEvent]) -> None:
        for event in events:
            if isinstance(event, FinalTranscriptEvent):
                if event.segment is None or not event.segment.text.strip():
                    continue
                await self._handle_final_transcript(event.segment.text)
            elif isinstance(event, StreamFailedEvent):
                self.state.status = "error"
                self.state.last_error = event.message

    async def _handle_final_transcript(self, source_text: str) -> None:
        self.state.last_source_text = source_text
        try:
            response = await self.translator_client.translate(
                TranslationRequest(source_text=source_text)
            )
            self.state.last_translated_text = response.translated_text
            self.overlay_controller.show_subtitle(
                translated_text=response.translated_text,
                source_text=source_text,
                config=self.app_config,
            )
        except Exception as exc:
            self.state.status = "error"
            self.state.last_error = str(exc)
            self.state.last_translated_text = source_text
            self.overlay_controller.show_subtitle(
                translated_text=source_text,
                source_text=source_text,
                config=self.app_config,
            )

    async def _cleanup(self, reset_state: bool) -> None:
        if self._cleaned_up:
            if reset_state:
                self._reset_state()
            return

        self._cleaned_up = True
        try:
            self.audio_input.stop()
        except Exception:
            pass

        if self._stream_started:
            try:
                await self.runtime_client.cancel_stream(
                    CancelStreamRequest(stream_id=self.stream_id, reason="session-stop")
                )
            except Exception:
                pass
            self._stream_started = False

        close_translator = getattr(self.translator_client, "aclose", None)
        if callable(close_translator):
            try:
                await close_translator()
            except Exception:
                pass

        try:
            await self.runtime_client.dispose()
        except Exception:
            pass

        self.overlay_controller.hide()
        self.overlay_controller.clear()
        if reset_state:
            self._reset_state()

    def _reset_state(self) -> None:
        self.state = SubtitleSessionState(
            runtime_mode=self.app_config.runtime_mode,
            translator_mode=self.app_config.translator_mode,
        )
