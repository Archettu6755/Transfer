"""Download, convert anime-whisper model, and fix preprocessor config."""

import json
import subprocess
import sys
from pathlib import Path

from huggingface_hub import hf_hub_download

MODEL_ID = "litagin/anime-whisper"
OUTPUT_DIR = "/app/model"

print(f"Converting {MODEL_ID} to CTranslate2 format...")
result = subprocess.run(
    [
        "ct2-transformers-converter",
        "--model", MODEL_ID,
        "--output_dir", OUTPUT_DIR,
        "--quantization", "int8",
        "--force",
    ],
    capture_output=True,
    text=True,
)
if result.returncode != 0:
    print(result.stdout)
    print(result.stderr, file=sys.stderr)
    raise RuntimeError("Model conversion failed")

# The ct2-transformers-converter does not copy preprocessor_config.json.
# faster-whisper needs it to determine the correct number of mel bins.
print("Downloading preprocessor_config.json...")
preprocessor_path = hf_hub_download(
    repo_id=MODEL_ID,
    filename="preprocessor_config.json",
)
preprocessor = json.loads(Path(preprocessor_path).read_text(encoding="utf-8"))
target = Path(OUTPUT_DIR) / "preprocessor_config.json"
target.write_text(json.dumps(preprocessor, ensure_ascii=False, indent=2), encoding="utf-8")
print(f"Saved preprocessor config to {target}")

print(f"Model converted successfully to {OUTPUT_DIR}")
