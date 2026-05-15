# Context Handoff

这份笔记只记录 **当前对话里确认过、但没有完整写进 `AGENTS.md` / `AGENTS-2.md` / `target.md` / `implementation.md` 的背景信息**。

## 1. 当前分支与远端状态

- 当前工作基线在 `main`
- 远端使用 `transfer`：`git@github.com:Archettu6755/Transfer.git`
- `transfer/main` 已同步到：
  - `5b754e0` `Complete Phase 6 UX polish: auto-hide timer, loopback audio, model refresh, Qt render fix`
- 旧工作分支 `codex-phase1-ts-validation`：
  - 本地已删除
  - 它的工作内容已经并入 `main`

## 2. 已废弃的历史路径

- `apps/extension` 已从当前工作树彻底删除
- 不再保留 `legacy/extension-archive`
- extension 只存在于 Git 历史中
- 当前活动工程只看：
  - `apps/desktop-cli`
  - `apps/web-demo`
  - `packages/shared`
  - `packages/core`
  - `packages/asr-local`
  - `packages/translator`
  - `packages/subtitle`

## 3. 当前 `desktop-cli` 的产品化决定

- 正式入口：
  - `desktop-cli init`
  - `desktop-cli start`
- 裸命令：
  - `desktop-cli` 等价于 `desktop-cli start`
- 正式帮助：
  - `desktop-cli help`
- 开发帮助：
  - `desktop-cli help --dev`
- 默认帮助不再展示开发命令
- 开发命令仍保留：
  - `overlay-demo`
  - `audio-input-demo`
  - `session-demo`

## 4. CLI 配置设计的额外约束

- 不做 TUI
- 不做 overlay 内设置按钮
- 不做 GUI 设置面板
- 正式用户配置当前只走 CLI
- `api_base_url` 永远不暴露给用户输入
- provider 由用户直接输入字符串，不做选择菜单
- model 由用户直接输入字符串，不做选择菜单
- API key 必须在 CLI 中输入，但 **只允许持久化到 `.env`**
- 普通配置文件 **不能** 保存 API key

## 5. 本地配置落点

当前 `desktop-cli` 使用：

- 非敏感配置：
  - `apps/desktop-cli/.desktop-cli.json`
- API key：
  - `apps/desktop-cli/.env`

规则：

- 当前进程环境变量优先于 `.env`
- `.env` 和 `.desktop-cli.json` 都已被 `.gitignore` 忽略
- `.gitignore` 中也显式列出了这两个文件

## 6. Provider / Model 当前实现状态

provider 表：

- 文件：
  - `apps/desktop-cli/src/desktop_cli/config/providers.py`

model 表：

- 文件：
  - `apps/desktop-cli/src/desktop_cli/config/models.py`

当前只是 **最小可用表**，不是完整厂商目录。

已实现的 provider canonical 名：

- `zhipu`
- `deepseek`（推荐）
- `qwen`（推荐）
- `kimi`

已确认可用的 alias 例子：

- `glm` -> `zhipu`
- `tongyi` -> `qwen`
- `moonshot` -> `kimi`

归一化规则：

- `strip()`
- `lower()`

所以大小写和前后空格已兼容。

当前 model 表只保留两档：

- `default`
- `flagship`

系统仍允许用户自由输入其他 model 名，不做强白名单。

### 6.1 当前模型清单（2026-05-15 更新）

| Provider | Default | Flagship |
|---|---|---|
| zhipu | GLM-4.7-FlashX | GLM-4.7 |
| deepseek | deepseek-v4-flash | deepseek-v4 |
| qwen | Qwen-MT-Flash | Qwen-MT-Plus |
| kimi | kimi-k2-0905-preview | kimi-k2.5 |

推荐使用 deepseek 或 qwen。`desktop-cli init` 会在 provider 输入前打印推荐信息。

## 7. 音频输入实现状态

### 7.1 Test Tone（默认）

- 合成 440Hz PCM16 正弦波
- 不需要真实声卡，适合离线验证
- 通过 `--audio-source test-tone` 或默认行为使用

### 7.2 WASAPI Loopback

- 捕获 Windows **系统音频输出流**（扬声器播放的内容）
- 不是麦克风输入，不接受外部麦克风
- 场景：浏览器播放直播、本地视频/音频文件
- 原理：`sd.RawInputStream` + `WasapiSettings(loopback=True)` 在输出设备上旁路 PCM 数据
- 通过 `--audio-source loopback` 启用

### 7.3 使用方式

```powershell
desktop-cli start --audio-source test-tone
desktop-cli start --audio-source loopback
```

## 8. 字幕 auto-hide 机制

- 实现在 `SubtitleController`（asyncio），**不在** `OverlayController`
- 默认 5 秒无新字幕自动隐藏
- 每次新字幕到达 → 取消旧 timer → 启动新 timer
- `auto_hide_ms <= 0` 时禁用

### 8.1 会话结束行为

- 自然结束（音频消费完毕）：**等待** auto-hide 走完，不立即隐藏
- 用户主动 stop：立即取消 auto-hide + hide + clear

## 9. Overlay 渲染修复

**问题：** `asyncio.run()` 独占主线程，Qt event loop 饿死，`window.show()` 从未被渲染。

**修复：** 在 `OverlayWindow` 的三个方法末尾直接调用 `QApplication.processEvents()`：

- `update_state()` — 每次 show/hide 后立即渲染
- `hide_overlay()` — hide 后立即渲染
- `clear()` — clear 后立即渲染

不复用 asyncio pump 方案（从 asyncio task 内调 `processEvents()` 无效）。overlay-demo 不受影响（它走 `app.exec()` Qt 主循环）。

## 10. 真实使用里发现的非 blocker 现象

手动测试里确认过：

- `web-demo` 调 DeepSeek 时翻译链路表现正常
- 某些 GLM coding/planning 类模型会很慢，且可能直接回显原文
- 当前系统 **没有** 做"译文疑似原文回显"的质量防护

这属于后续质量增强项，不是当前主线断裂。

## 11. 当前最可能的后续工作

- WSL 中搭建 Docker + anime-whisper 运行环境
- 实现 `runtime_client/anime_whisper.py`（当前为 blocker 骨架，仿 `FakeRuntimeClient` 接口实现真实 ASR 通信）
- `start.py` 接入真实 runtime（当前 `runtime_mode="fake"` 硬编码）
- live audio 完整本地链路验证
- 暂不扩充 provider/model 表到完整目录
