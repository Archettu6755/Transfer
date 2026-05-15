from __future__ import annotations

import asyncio

from desktop_cli.audio_input import AudioChunk
from desktop_cli.runtime_client import (
    AudioInputPayload,
    CancelStreamRequest,
    FakeRuntimeClient,
    FinishStreamRequest,
    RuntimeClientConfig,
    StartStreamRequest,
    TranscribeFileRequest,
)


def test_fake_runtime_client_emits_final_transcript_after_configured_chunk_count() -> None:
    client = FakeRuntimeClient(final_after_chunks=2)

    async def run_test() -> tuple[list[object], list[object]]:
        await client.init(RuntimeClientConfig(base_url="mock://fake"))
        await client.start_stream(
            StartStreamRequest(stream_id="stream-1", sample_rate=16_000)
        )
        first = await client.push_chunk(
            AudioChunk(
                chunk_id=0,
                pcm_bytes=b"\x00\x00",
                sample_rate=16_000,
                channels=1,
                duration_ms=100,
            )
        )
        second = await client.push_chunk(
            AudioChunk(
                chunk_id=1,
                pcm_bytes=b"\x00\x00",
                sample_rate=16_000,
                channels=1,
                duration_ms=100,
            )
        )
        return first, second

    first_events, second_events = asyncio.run(run_test())

    assert first_events == []
    assert len(second_events) == 1
    assert second_events[0].type == "final-transcript"
    assert second_events[0].segment is not None
    assert second_events[0].segment.text == "これはフェイク runtime の最終文字起こしです。"


def test_fake_runtime_finish_cancel_and_transcribe_file_paths_are_readable() -> None:
    client = FakeRuntimeClient(final_after_chunks=10)

    async def run_test() -> tuple[list[object], list[object], str]:
        await client.init(RuntimeClientConfig(base_url="mock://fake"))
        response = await client.transcribe_file(
            request=TranscribeFileRequest(
                request_id="req-1",
                audio=AudioInputPayload(id="audio-1", sample_rate=16_000),
            ),
        )
        await client.start_stream(StartStreamRequest(stream_id="stream-2"))
        finish_events = await client.finish_stream(FinishStreamRequest(stream_id="stream-2"))
        cancel_events = await client.cancel_stream(
            CancelStreamRequest(stream_id="stream-2", reason="test")
        )
        await client.dispose()
        return finish_events, cancel_events, response.text

    finish_events, cancel_events, response_text = asyncio.run(run_test())

    assert response_text == "これはフェイク runtime の最終文字起こしです。"
    assert finish_events[-1].type == "stream-completed"
    assert cancel_events[-1].type == "stream-completed"
