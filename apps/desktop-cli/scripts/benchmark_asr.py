"""Benchmark anime-whisper ASR against reference Japanese voice lines (local CUDA)."""

from __future__ import annotations

import re
import struct
import sys
import time
import wave
from dataclasses import dataclass, field
from pathlib import Path

import numpy as np
from faster_whisper import WhisperModel

AUDIO_DIR = Path("/mnt/d/19054/archetto_voice/ja")
VOICE_SOURCE = Path("/mnt/d/19054/archetto_voice/voice_source.txt")
MODEL_PATH = "/home/archtto/models/anime-whisper-ct2"
TARGET_SR = 16_000


# ── parsing ──────────────────────────────────────────────────────────

def parse_reference() -> dict[str, str]:
    raw = VOICE_SOURCE.read_text(encoding="utf-8")
    titles = re.findall(r"\|标题\d+=(.+?)\n", raw)
    dialogs = re.findall(r"\|台词\d+=\{\{.*?\}\}\n", raw, re.DOTALL)
    refs: dict[str, str] = {}
    for title, dialog in zip(titles, dialogs):
        title = title.strip()
        ja_match = re.search(r"日文\|(.+?)\}\}", dialog)
        if ja_match:
            refs[title] = ja_match.group(1).strip()
    return refs


# ── audio helpers ────────────────────────────────────────────────────

def load_audio(path: Path) -> np.ndarray:
    """Load WAV and resample to TARGET_SR, return float32 numpy array."""
    with wave.open(str(path), "rb") as wf:
        pcm = wf.readframes(wf.getnframes())
        sr = wf.getframerate()

    samples = struct.unpack(f"<{len(pcm) // 2}h", pcm)
    arr = np.array(samples, dtype=np.float32) / 32768.0

    if sr != TARGET_SR:
        ratio = TARGET_SR / sr
        out_len = int(len(arr) * ratio)
        indices = np.arange(out_len) / ratio
        lo = np.floor(indices).astype(np.int64)
        hi = np.minimum(lo + 1, len(arr) - 1)
        frac = indices - lo
        arr = arr[lo] * (1 - frac) + arr[hi] * frac

    return arr


# ── Japanese tokenization for WER ────────────────────────────────────

_JWORD_SPLIT_RE = re.compile(r"([。、．，！？…「」『』（）［］｛｝　\s])")


def tokenize_ja(text: str) -> list[str]:
    tokens: list[str] = []
    for part in _JWORD_SPLIT_RE.split(text):
        part = part.strip()
        if not part:
            continue
        if _JWORD_SPLIT_RE.match(part):
            tokens.append(part)
        else:
            tokens.extend(part)
    return tokens


# ── metrics ──────────────────────────────────────────────────────────

@dataclass
class ErrorDetail:
    substitutions: int = 0
    deletions: int = 0
    insertions: int = 0


@dataclass
class BenchmarkResult:
    file: str
    duration_s: float
    latency_s: float
    ref_chars: int
    hyp_chars: int
    ref_words: int
    hyp_words: int
    cer: float
    wer: float
    error: ErrorDetail = field(default_factory=ErrorDetail)


def compute_edit_distance(ref: list[str], hyp: list[str]) -> ErrorDetail:
    n, m = len(ref), len(hyp)
    d = [[0] * (m + 1) for _ in range(n + 1)]
    for i in range(n + 1):
        d[i][0] = i
    for j in range(m + 1):
        d[0][j] = j

    for i in range(1, n + 1):
        for j in range(1, m + 1):
            cost = 0 if ref[i - 1] == hyp[j - 1] else 1
            d[i][j] = min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost)

    subs = dels = inss = 0
    i, j = n, m
    while i > 0 or j > 0:
        if i > 0 and j > 0 and ref[i - 1] == hyp[j - 1]:
            i -= 1
            j -= 1
        elif i > 0 and j > 0 and d[i][j] == d[i - 1][j - 1] + 1:
            subs += 1
            i -= 1
            j -= 1
        elif i > 0 and d[i][j] == d[i - 1][j] + 1:
            dels += 1
            i -= 1
        elif j > 0 and d[i][j] == d[i][j - 1] + 1:
            inss += 1
            j -= 1
        else:
            break
    return ErrorDetail(substitutions=subs, deletions=dels, insertions=inss)


def rate(ref: str, hyp: str, duration_s: float, latency_s: float) -> BenchmarkResult:
    ref_chars = list(ref)
    hyp_chars = list(hyp)
    ref_words = tokenize_ja(ref)
    hyp_words = tokenize_ja(hyp)

    char_err = compute_edit_distance(ref_chars, hyp_chars)
    word_err = compute_edit_distance(ref_words, hyp_words)

    cer_val = (char_err.substitutions + char_err.deletions + char_err.insertions) / max(len(ref_chars), 1) * 100
    wer_val = (word_err.substitutions + word_err.deletions + word_err.insertions) / max(len(ref_words), 1) * 100

    return BenchmarkResult(
        file="",
        duration_s=duration_s,
        latency_s=latency_s,
        ref_chars=len(ref_chars),
        hyp_chars=len(hyp_chars),
        ref_words=len(ref_words),
        hyp_words=len(hyp_words),
        cer=cer_val,
        wer=wer_val,
        error=char_err,
    )


# ── main ─────────────────────────────────────────────────────────────

def main() -> int:
    refs = parse_reference()
    print(f"Reference texts: {len(refs)}")

    wav_files = sorted(
        [f for f in AUDIO_DIR.glob("*.wav")],
        key=lambda f: f.stat().st_size,
    )
    print(f"Audio files:    {len(wav_files)}")
    print(f"Model:          {MODEL_PATH}")
    print(f"Device:         cuda (float16)")
    print("=" * 78)

    model = WhisperModel(MODEL_PATH, device="cuda", compute_type="float16")
    results: list[BenchmarkResult] = []

    for i, path in enumerate(wav_files):
        title = path.stem
        ref = refs.get(title, "")
        if not ref:
            print(f"  SKIP {path.name}: no reference")
            continue

        audio = load_audio(path)
        duration = len(audio) / TARGET_SR

        t0 = time.perf_counter()
        segments, _info = model.transcribe(audio, language="ja", beam_size=5)
        hyp = "".join(seg.text for seg in segments)
        latency = time.perf_counter() - t0

        r = rate(ref, hyp, duration, latency)
        r.file = path.name

        rtf = latency / max(duration, 0.001)

        print(f"\n  [{i+1}/{len(wav_files)}] {path.name}  [{duration:.1f}s, {latency:.1f}s RTF={rtf:.2f}]")
        print(f"    REF ({r.ref_chars}c):  {ref}")
        print(f"    ASR ({r.hyp_chars}c):  {hyp}")
        print(f"    CER: {r.cer:.1f}%  "
              f"WER: {r.wer:.1f}%  "
              f"Sub/Del/Ins: {r.error.substitutions}/{r.error.deletions}/{r.error.insertions}  "
              f"lenR: {r.hyp_chars/max(r.ref_chars,1):.2f}")

        results.append(r)

    if not results:
        print("No results.")
        return 1

    # ── summary table ─────────────────────────────────────────────
    print("\n" + "=" * 78)
    print(f"{'File':<22s} {'Dur':>5s} {'Lat':>6s} {'RTF':>5s} {'CER':>6s} {'WER':>6s} {'S/D/I':>12s} {'lenR':>5s}")
    print("-" * 78)
    for r in sorted(results, key=lambda x: x.cer):
        print(
            f"{r.file:<22s} {r.duration_s:>4.0f}s {r.latency_s:>5.1f}s {r.latency_s/max(r.duration_s,0.001):>4.2f}x "
            f"{r.cer:>5.1f}% {r.wer:>5.1f}% "
            f"{r.error.substitutions:>3d}/{r.error.deletions:>3d}/{r.error.insertions:>3d} "
            f"{r.hyp_chars/max(r.ref_chars,1):>4.2f}"
        )
    print("-" * 78)

    avg_cer = sum(r.cer for r in results) / len(results)
    avg_wer = sum(r.wer for r in results) / len(results)
    avg_rtf = sum(r.latency_s / max(r.duration_s, 0.001) for r in results) / len(results)
    avg_len = sum(r.hyp_chars / max(r.ref_chars, 1) for r in results) / len(results)
    total_dur = sum(r.duration_s for r in results)
    total_lat = sum(r.latency_s for r in results)
    print(
        f"{'AVERAGE':<22s} {total_dur:>4.0f}s {total_lat:>5.1f}s {avg_rtf:>4.2f}x "
        f"{avg_cer:>5.1f}% {avg_wer:>5.1f}%              {avg_len:>4.2f}"
    )

    # ── duration buckets ───────────────────────────────────────────
    for label, lo, hi in [("Short (<15s)", 0, 15), ("Medium (15-35s)", 15, 35), ("Long (>35s)", 35, 999)]:
        group = [r for r in results if lo <= r.duration_s < hi]
        if group:
            print(f"  {label}: avg CER {sum(r.cer for r in group)/len(group):.1f}%  (n={len(group)})")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
