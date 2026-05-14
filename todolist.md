# TODO List

## Phase 0 — Python Infrastructure
- [ ] 新建 `apps/desktop-cli/`
- [ ] 新建 `pyproject.toml`
- [ ] 建立目录骨架：
  - [ ] `cli/`
  - [ ] `audio_input/`
  - [ ] `runtime_client/`
  - [ ] `translator_client/`
  - [ ] `subtitle_controller/`
  - [ ] `overlay_window/`
  - [ ] `config/`
  - [ ] `tests/`
- [ ] 明确 Python 版本目标：`3.11+`
- [ ] 明确 GUI 技术栈：`PySide6`
- [ ] 明确 CLI 启动入口
- [ ] 明确本地配置读取方式
- [ ] 处理规格同步：`AGENTS-2.md` 不再提 extension integration

## Phase 1 — Mock Pipeline + File Validation
- [ ] 收紧 shared 语言范围到 `ja` / `zh-CN`
- [ ] 修改 `packages/shared/src/language.ts`
- [ ] 修改 `packages/shared/src/settings.ts`
- [ ] 收紧 `packages/asr-local/src/MockASRProvider.ts` 到 `ja`
- [ ] 收紧 `packages/translator/src/MockTranslator.ts` 到 `zh-CN`
- [ ] 收紧 `packages/translator/src/prompt.ts` 到固定 `ja -> zh-CN`
- [ ] 调整 `core` 测试与 shared 类型
- [ ] 改造 `web-demo` 为文件验证工具：
  - [ ] 移除语言选择器
  - [ ] 固定方向显示 `ja -> zh-CN`
  - [ ] 保留文件上传
  - [ ] 保留字幕预览
  - [ ] 保留 debug panel
- [ ] 更新 `web-demo` 测试

## Phase 2 — OpenAI-compatible Translator
- [ ] 保留 `OpenAICompatibleTranslator`
- [ ] 确认其只服务 `ja -> zh-CN`
- [ ] 调整 prompt、测试用例、默认文案
- [ ] 保留 provider preset + custom 覆盖
- [ ] 确认错误信息不泄露 API key
- [ ] `web-demo` 仅保留必要的 LLM 配置验证
- [ ] 翻译失败时提供后续 UI fallback 所需信息

## Phase 3 — anime-whisper Client + File Input
- [ ] 明确 `packages/asr-local` 角色为协议与 client 验证层
- [ ] 将 `LocalASRProvider` 语义改为 `anime-whisper`
- [ ] 统一错误文案与接口命名
- [ ] 确认 `protocol.ts` 为稳定协议
- [ ] 打通 file input 验证链路
- [ ] 为 `asr-local` 补测试脚本和最小验证
- [ ] 让 `web-demo` 能完成：
  - [ ] file -> runtime client
  - [ ] final transcript -> translation
  - [ ] subtitle preview

## Phase 4 — Local Overlay Window
- [ ] 在 `apps/desktop-cli` 中实现 PySide6 overlay window
- [ ] 支持：
  - [ ] 最新一条字幕显示
  - [ ] 可选原文显示
  - [ ] 基础换行
  - [ ] 固定样式参数
  - [ ] 隐藏与 cleanup
- [ ] 不实现：
  - [ ] 滚动字幕
  - [ ] 正式双语模式
  - [ ] 增量字幕
  - [ ] 高级多行布局
- [ ] 将 extension overlay 视为废弃参考
- [ ] 最小手动验证：
  - [ ] 启动窗口
  - [ ] 注入测试字幕
  - [ ] 超时隐藏
  - [ ] stop 后清空

## Phase 5 — Live Audio Input
- [ ] 在 `apps/desktop-cli/src/audio_input/` 建立 live audio 输入边界
- [ ] 明确 live audio 与 file input 的统一接口
- [ ] 让 live audio 事件进入 runtime client 边界
- [ ] 设计音频失败时的用户可读错误
- [ ] 明确是否需要音频 passthrough
- [ ] 不再沿用 extension 的：
  - [ ] `chrome.tabCapture`
  - [ ] `offscreen`
  - [ ] `audio-worklet`
  - [ ] `serviceWorker`
- [ ] 处理 `packages/shared/src/messages.ts` 中的 extension/offscreen 专用共享类型

## Phase 6 — Full Local CLI Loop
- [ ] 实现 CLI session lifecycle
- [ ] 连接：
  - [ ] live audio
  - [ ] `anime-whisper`
  - [ ] translator
  - [ ] subtitle controller
  - [ ] overlay window
- [ ] 固定行为：
  - [ ] only final transcript enters translation
  - [ ] latest subtitle replaces previous subtitle
  - [ ] translation failure shows source fallback
  - [ ] stop releases all resources
- [ ] 迁移当前可复用控制流：
  - [ ] `transcriptCoordinator` 思路
  - [ ] subtitle auto-hide 思路
  - [ ] latest-single-subtitle 策略
- [ ] 不再以 extension background/session 作为主闭环

## Cleanup / Freeze
- [ ] 明确 `apps/extension/` 的处理策略：
  - [ ] 停止继续投入
  - [ ] 从主验证链路剔除
  - [ ] 后续决定归档或保留为历史代码
- [ ] 明确继续保留的 TS 包：
  - [ ] `shared`
  - [ ] `core`
  - [ ] `asr-local`
  - [ ] `translator`
  - [ ] `subtitle`
- [ ] 明确哪些内容只保留作验证资产

## Validation Checklist
- [ ] 仓库级现有 TS 校验仍能跑通或被合理降级
- [ ] `web-demo` 文件验证链路能跑通
- [ ] Python CLI 最小启动成功
- [ ] overlay window 最小显示成功
- [ ] runtime client 文件输入验证成功
- [ ] live audio 接入后完整本地链路验证成功

## Assumptions
- [ ] 当前不在这台机器上做真实 `anime-whisper` runtime 验证
- [ ] 当前不实现任何 V2 功能
- [ ] `web-demo` 继续保留，但只做文件验证
- [ ] extension 正式退出主产品路线
