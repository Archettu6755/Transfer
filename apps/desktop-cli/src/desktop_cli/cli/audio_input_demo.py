"""Standalone audio input demo entrypoint."""

from __future__ import annotations

import argparse
from collections.abc import Sequence

from desktop_cli.audio_input import (
    AudioInputConfig,
    LoopbackAudioInput,
    TestToneAudioInput,
    list_output_devices,
)


def run_audio_input_demo(argv: Sequence[str] | None = None) -> int:
    parser = argparse.ArgumentParser(prog="desktop-cli audio-input-demo")
    parser.add_argument("--source", choices=["loopback", "test-tone"], default="test-tone")
    parser.add_argument("--sample-rate", type=int, default=16_000)
    parser.add_argument("--chunk-ms", type=int, default=100)
    parser.add_argument("--duration-ms", type=int, default=300)
    parser.add_argument("--device-name")
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--list-devices", action="store_true")
    args = parser.parse_args(list(argv) if argv is not None else None)

    if args.dry_run:
        print("audio-input-demo dry run OK")
        return 0

    if args.list_devices:
        for device in list_output_devices():
            print(device)
        return 0

    config = AudioInputConfig(
        source=args.source,
        sample_rate=args.sample_rate,
        chunk_ms=args.chunk_ms,
        duration_ms=args.duration_ms,
        device_name=args.device_name,
    )
    source = _create_source(config)
    expected_chunks = max(1, (args.duration_ms + args.chunk_ms - 1) // args.chunk_ms)

    source.start()
    try:
        for _ in range(expected_chunks):
            chunk = source.read_chunk()
            if chunk is None:
                continue
            print(
                "chunk="
                f"{chunk.chunk_id} sample_rate={chunk.sample_rate} "
                f"duration_ms={chunk.duration_ms} bytes={len(chunk.pcm_bytes)}"
            )
    finally:
        source.stop()

    return 0


def _create_source(config: AudioInputConfig):
    if config.source == "test-tone":
        return TestToneAudioInput(config)
    return LoopbackAudioInput(config)
