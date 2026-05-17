# Context Handoff

这份笔记记录当前对话里确认过、但没有完整写进 `AGENTS.md` / `target.md` / `implementation.md` 的背景信息。

## 1. 分支与远端

- 基线 `main`，远端 `git@github.com:Archettu6755/Transfer.git`
- 最新提交：
  - `3f9c876` `chore: remove Dolphin ASR integration`
  - `a2b72e7` `feat: Docker ASR runtime with anime-whisper + CUDA, VAD optimization, WebSocket client`
- AGENTS-3.md 适用（Docker + WSL2 可用）

## 2. 已废弃的历史路径

- `apps/extension` 已删除
- 当前活跃工程：`apps/desktop-cli`、`apps/web-demo`、`packages/shared`、`packages/core`、`packages/asr-local`、`packages/translator`、`packages/subtitle`
- 新增：`docker/asr-server/`（ASR 运行时）

## 3. Docker ASR 运行时

### 3.1 架构

```
desktop-cli / web-demo → WebSocket → ws://127.0.0.1:9000 → docker-asr-server
```

- `docker/asr-server/Dockerfile` — Python 3.11 + CUDA torch + faster_whisper
- `docker/asr-server/server.py` — WebSocket 服务，anime-whisper + Silero VAD + chunked 转录
- `docker/asr-server/download_model.py` — 从 HuggingFace 下载 `litagin/anime-whisper`，CTranslate2 int8 量化
- `docker/docker-compose.yml` — GPU 透传（`driver: nvidia`），端口 9000
- 模型路径：容器内 `/app/model`，预编译 CTranslate2 格式 + `preprocessor_config.json`

### 3.2 硬件

- GPU：NVIDIA RTX 4060 Laptop (8GB)，CUDA 13.1，float16 推理
- RTF ~0.06x（408s 音频 / 16s 推理）

### 3.3 VAD 演进

| 阶段 | 方案 | CER |
|---|---|---|
| 1 | Energy-based 手写 VAD | 52.4% |
| 2 | Silero VAD（`vad_filter=True`，默认参数）| 44.4% |
| 3 | + CUDA float16 | 39.2% |
| 4 | + Chunked transcription（>25s 强制 15s 分块 + 2s overlap）| **35.8%** |

最终方案：Silero VAD（threshold=0.5, speech_pad=400ms）+ 25s 阈值分块 + `_dedup_segments()`。

### 3.4 cublas 兼容性

Docker 内 CUDA 13 提供了 `libcublas.so.13`，但 faster_whisper/ctranslate2 需要 `.so.12`。
修复：Dockerfile 创建 symlink + 设置 `LD_LIBRARY_PATH`。

### 3.5 mel bins 修复

`litagin/anime-whisper` 基于 Whisper large-v3（128 mel bins），但 CTranslate2 转换器不复制 `preprocessor_config.json`。
修复：`download_model.py` 从 HuggingFace 单独下载此文件放入 `/app/model/`。

## 4. 客户端（WebSocket 协议）

### 4.1 Python 桌面端

- `runtime_client/client.py` — `RuntimeClient` 协议定义
- `runtime_client/anime_whisper.py` — 真实 WebSocket 客户端，`websockets` 库
- `runtime_client/fake.py` — Mock 客户端（开发/测试）
- `start.py` — `runtime_mode="anime-whisper"` 默认，支持 `--runtime-url` 和 `DESKTOP_CLI_RUNTIME_URL` 环境变量
- `session_demo.py` — 自动 `docker compose up -d` 拉起 ASR 服务

### 4.2 TypeScript Web Demo

- `packages/asr-local/src/WebSocketASRClient.ts` — 浏览器 WebSocket 客户端
- `packages/asr-local/src/LocalASRProvider.ts` — 默认注入 WebSocket 客户端
- 四种装配方式全部可用（Mock/Local ASR × Mock/OpenAI-compatible Translator）

### 4.3 协议

```
Client → Server:
  {"type":"start-stream","stream_id":"...","source_lang":"ja","sample_rate":16000}
  {binary: PCM16 bytes}
  {"type":"finish-stream","stream_id":"..."}
  {"type":"cancel-stream","stream_id":"...","reason":"..."}

Server → Client:
  {"type":"stream-started","stream_id":"..."}
  {"type":"final-transcript","stream_id":"...","segment":{"id":"...","text":"...","is_final":true,...}}
  {"type":"stream-completed","stream_id":"..."}
  {"type":"stream-failed","stream_id":"...","message":"...","retryable":false}
```

## 5. CLI 配置

保持不变（§4–§6 of old context-handoff）。新增：

- `runtime_base_url` 字段（`AppConfig`），默认 `ws://127.0.0.1:9000`
- `--runtime-url` CLI 参数 / `DESKTOP_CLI_RUNTIME_URL` 环境变量
- `glossary: dict[str,str]` 字段预留（未接线到 prompt）

## 6. 翻译 Prompt 优化

`openai_compatible.py` 的 system prompt 已升级为 7 条规则：
口语风格、简洁、保留情感标记、ASR 破损时最佳猜测、游戏术语用饭圈通用译法等。
Glossary 注入点预留：注释标注接线方式。

## 7. Dolphin 对比实验

- 部署了 `DataoceanAI/dolphin-small`（372M）在 Docker 内与 anime-whisper 并行
- 完整 24 文件对比评测完成
- 结果：Dolphin CER 31.1% vs anime-whisper 36.4%（Dolphin 低 5.3pp）
- Dolphin 在短/长文件、专有名词上更强；anime-whisper 在正常时长干净音频上更好
- **决定：保留 anime-whisper 为主线，Dolphin 完全清理（`3f9c876`）**
- 评测数据和报告保留在 `benchmark_report.md` 和 `scripts/compare_results.json`
- 重新部署 Dolphin 的代价很小（3 个文件改动 + 重建），架构支持

## 8. 评测体系

- 评测集：24 条 Archetto 游戏语音（408s），日文参考文本来自 `voice_source.txt`
- 数据集：`scripts/eval_dataset.json`（gitignored）
- 评测脚本：`scripts/benchmark_asr.py`
- 指标：CER、WER、Sub/Del/Ins、lenR、RTF、Proper Noun CER
- 报告：`benchmark_report.md`（gitignored）

## 9. 当前已知问题

1. **VAD 首次节丢失** — Silero VAD threshold 0.5 对开头静音段不敏感，`speech_pad_ms` 增加可缓解
2. **长句 chunk 边界 artifact** — 25s 阈值分块引入少量重复/截断
3. **专有名词识别率低** — CER 35.8%，PN CER 63.1%（anime-whisper 的薄弱项）
4. **部分评测数据存疑** — `生日`/`周年庆典` 参考文本可能是中文（非日语音频）
5. **Docker Desktop 不稳定** — 在 WSL2 中偶尔 SIGBUS 或 I/O error
6. **评测集太小** — 24 条/408s，结论外推需谨慎

## 10. 明确不做/已延期

- Dolphin 不作为主线（实验完成，已清理）
- 不做本地子进程方案（保持 Docker 部署契约）
- Glossary 功能延期至 V2（字段已预留）
- 微调训练暂不进行（无足够同域标注数据）
- 不做 GUI 设置面板 / TUI（CLI 唯一配置入口）
- 不做 Cloud ASR、增量字幕、双语模式、口播人识别等 V2 特性
