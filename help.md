# desktop-cli Help

`desktop-cli` 是当前 MVP 的本地命令行入口。  
固定字幕方向：

```text
ja -> zh-CN
```

当前命令：

- `init`
- `start`
- `help`

---

## 1. Quick Start

首次使用：

```powershell
desktop-cli init
desktop-cli
```

只想检查命令是否可运行：

```powershell
desktop-cli start --dry-run
```

查看正式帮助：

```powershell
desktop-cli help
```

查看开发帮助：

```powershell
desktop-cli help --dev
```

---

## 2. Command Overview

| Command | Purpose |
|---|---|
| `desktop-cli init` | 初始化本地配置，保存 provider、model 和显示设置，并把 API key 写入本地 `.env` |
| `desktop-cli start` | 正式启动命令，读取已保存配置并启动本地字幕流程 |
| `desktop-cli help` | 显示正式帮助；加 `--dev` 可查看开发命令 |

---

## 3. `desktop-cli init`

交互式初始化命令：

```powershell
desktop-cli init
```

它会依次要求输入：

- provider name
- model name
- API key
- font family
- font size
- background opacity
- whether to show source text

行为说明：

- provider 直接输入，不做选择菜单
- provider 支持 alias 归一化
  - 例如：`glm` 会归一到 `zhipu`
- model 直接输入，不做强白名单限制
- API key 会写入本地 `.env`
- 普通配置文件不会保存 API key

初始化完成后会生成：

- `.desktop-cli.json`
- `.env`

---

## 4. `desktop-cli start`

正式启动命令：

```powershell
desktop-cli start
```

也可以直接使用裸命令：

```powershell
desktop-cli
```

默认行为：

- 读取 `.desktop-cli.json`
- 读取 `.env` 中对应 provider 的 API key
- 启动本地字幕流程

如果还没有初始化，会返回可读错误，并提示先运行：

```powershell
desktop-cli init
```

### Supported options

#### `--provider`, `-p`

临时覆盖 provider：

```powershell
desktop-cli start --provider zhipu
desktop-cli start --provider glm
desktop-cli start --provider deepseek
```

说明：

- `glm` 和 `zhipu` 会归一到同一个 provider
- provider 改变后，会自动切换内部 API endpoint 和对应的 API key 环境变量名

#### `--model`, `-m`

临时覆盖 model：

```powershell
desktop-cli start --model GLM-4.7-FlashX
desktop-cli start --model deepseek-v4-flash
```

#### `--audio-source`

选择音频输入源：

```powershell
desktop-cli start --audio-source test-tone
desktop-cli start --audio-source loopback
```

说明：

- `test-tone`（默认）：使用合成测试音频，不需要真实声卡，适合验证流程
- `loopback`：通过 WASAPI Loopback 捕获系统音频输出（浏览器、本地播放器等），不接受麦克风输入

#### `--font`, `-f`

临时覆盖字体族名：

```powershell
desktop-cli start --font "Microsoft YaHei"
```

#### `--font-size`, `-s`

临时覆盖字体大小：

```powershell
desktop-cli start --font-size 36
```

#### `--bg`, `-b`

临时覆盖背景透明度，范围 `0 ~ 1`：

```powershell
desktop-cli start --bg 0.6
```

#### `--source-text`

显示原文：

```powershell
desktop-cli start --source-text
```

#### `--dry-run`

只检查配置和命令入口，不真正启动流程：

```powershell
desktop-cli start --dry-run
```

### Example

```powershell
desktop-cli start --provider zhipu --model GLM-4.7-FlashX --audio-source test-tone --font "Microsoft YaHei" --font-size 36 --bg 0.6 --source-text
desktop-cli start --provider deepseek --audio-source loopback --font "Microsoft YaHei" --source-text
```

---

## 5. Saved Config and API Key Storage

### Non-sensitive config

普通配置保存在：

```text
.desktop-cli.json
```

其中包含：

- provider
- model_name
- font_family
- font_size
- background_opacity
- show_source_text

### API key storage

API key 保存在：

```text
.env
```

例如：

```env
DESKTOP_CLI_ZHIPU_API_KEY=your-key
DESKTOP_CLI_DEEPSEEK_API_KEY=your-key
```

规则：

- API key 不写入 `.desktop-cli.json`
- 当前进程环境变量优先于 `.env`
- 如果缺少所需 key，`start` 会报可读错误

---

## 6. Provider Notes

当前 provider 走内部映射，不要求用户输入 `api_base_url`。

已接入的 canonical provider 包括：

- `zhipu`
- `deepseek`（推荐）
- `qwen`（推荐）
- `kimi`

推荐使用 deepseek 或 qwen。

已支持的典型 alias 包括：

- `glm` -> `zhipu`
- `zhipu` -> `zhipu`
- `tongyi` -> `qwen`
- `moonshot` -> `kimi`

如果 provider 无法识别，CLI 会报错并提示支持的 provider/alias。

---

## 7. Development Commands

下面这些命令仍然保留，但主要面向开发验证，不是正式用户入口。

### `desktop-cli overlay-demo`

测试本地字幕 overlay：

```powershell
desktop-cli overlay-demo
desktop-cli overlay-demo --dry-run
desktop-cli overlay-demo --show-source-text
```

参数：

- `--dry-run`
- `--show-source-text`
- `--duration-ms`

### `desktop-cli audio-input-demo`

测试音频输入边界：

```powershell
desktop-cli audio-input-demo --source test-tone --duration-ms 300
desktop-cli audio-input-demo --list-devices
desktop-cli audio-input-demo --source loopback --duration-ms 500
```

参数：

- `--source loopback|test-tone`
- `--sample-rate`
- `--chunk-ms`
- `--duration-ms`
- `--device-name`
- `--dry-run`
- `--list-devices`

### `desktop-cli session-demo`

开发验证用的完整会话命令，保留内部测试参数：

```powershell
desktop-cli session-demo --runtime-mode fake --translator-mode mock --audio-source test-tone --duration-ms 300
```

它仍暴露内部测试参数，例如：

- `--runtime-mode`
- `--translator-mode`
- `--audio-source`
- `--api-base-url`
- `--api-key`
- `--model-name`

这些参数主要用于开发和验证，不属于正式产品入口设计。

这些开发命令默认不会出现在正式帮助里。需要时使用：

```powershell
desktop-cli help --dev
```

---

## 8. Current Product Notes

当前 `desktop-cli start` 的定位是：

- 正式用户入口
- 使用本地配置和本地 `.env`
- 支持最基础的字幕显示参数覆盖

当前仍然不是最终完成状态的部分：

- 真实 `anime-whisper` runtime 的正式用户暴露方式还未定稿
- 当前工作站不做真实 `anime-whisper` runtime 手动验证
- `session-demo` 仍保留一套开发验证参数，后续可能继续收口

---

## 9. Common Examples

首次初始化：

```powershell
desktop-cli init
```

用已保存配置启动：

```powershell
desktop-cli
```

临时覆盖 provider 和 model：

```powershell
desktop-cli start --provider glm --model GLM-4.7-FlashX
```

临时覆盖显示样式：

```powershell
desktop-cli start --font "Microsoft YaHei" --font-size 36 --bg 0.6 --source-text
```

只做命令检查：

```powershell
desktop-cli start --dry-run
```
