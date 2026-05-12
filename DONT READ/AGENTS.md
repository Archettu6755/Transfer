# AGENTS.md — Agent 工作流约束

> 本文档定义 Agent 在此项目中的**行为规范、决策边界和工作流程**。
> 所有 Agent（包括 Claude、Cursor、Copilot 等）在操作本项目时必须遵守本文档。

---

## 首要原则

1. **TARGET.md 是唯一目标基准**：功能边界、类型定义、交付物路径以 TARGET.md 为准，不得自行扩展。
2. **不做未被要求的事**：不预埋"以后可能用到"的接口、枚举值、TODO、feature flag。
3. **先 Mock 后真实**：每个模块先用 Mock 实现跑通链路，再替换为真实实现。
4. **每次操作后必须验证**：写完代码后主动运行验证命令，确认结果符合预期再汇报完成。

---

## 任务执行流程

Agent 收到任务后，**必须按以下步骤执行**，不得跳过：

```
Step 1. 理解任务
  - 阅读 TARGET.md 中对应阶段的目标和验收标准
  - 如果任务描述与 TARGET.md 有冲突，优先以 TARGET.md 为准，并明确告知用户

Step 2. 确认范围
  - 列出本次任务涉及的文件（新增 / 修改 / 删除）
  - 确认不会超出 TARGET.md 定义的语言范围和功能范围
  - 如有歧义，先提问，不猜测

Step 3. 执行
  - 按最小变更原则操作：只改完成当前任务所需的文件
  - 遵守下方"编码约束"章节中的所有规则

Step 4. 自验证
  - 运行对应验收命令（见下方"验收命令速查"）
  - 如果命令失败，自行修复，不把失败状态汇报为完成

Step 5. 汇报
  - 列出实际修改的文件清单
  - 粘贴验收命令的输出（或关键摘要）
  - 如有无法解决的阻塞，明确描述问题和已尝试的方案
```

---

## 编码约束

### 语言与类型

- **所有语言代码必须来自 `packages/shared`**，不在各包内重复定义 `SourceLanguage` / `TargetLanguage`。
- 禁止出现字符串字面量 `'zh'` / `'en'` / `'ja'` / `'zh-CN'` 散落在业务逻辑中，必须通过类型约束。
- 禁止添加 `'ko'`（韩语）或其他 TARGET.md 未列出的语言代码，即使只是注释。

### API Key 安全

- API Key **只能**存在于：
  - 用户在 UI 中输入的运行时变量
  - `chrome.storage.local`（Extension）
  - `.env.local`（Web Demo 本地开发，且必须在 `.gitignore` 中）
- 禁止将 API Key 硬编码在任何源码文件、测试文件、配置文件中。
- 禁止将 API Key 打印到控制台（`console.log`）。

### Provider 抽象

- ASR 实现必须实现 `ASRProvider` 接口（定义于 `packages/core`）。
- Translator 实现必须实现 `TranslatorProvider` 接口。
- 禁止在 `Pipeline` 内直接 `new BrowserASRProvider()` 或 `new OpenAICompatibleTranslator()`；必须通过依赖注入传入。

### Mock 实现规范

- Mock 实现不得依赖网络请求、WASM、Node.js 特有 API。
- Mock 返回值必须覆盖所有 `SourceLanguage` / `TargetLanguage` 枚举值。
- Mock 实现不得在生产 bundle 中被引用（通过 tree-shaking 或显式 import 隔离）。

### Chrome Extension 规范

- 必须使用 **Manifest V3**。
- `chrome.tabCapture` 只能在 offscreen document 中使用，不在 content script 或 popup 中直接调用。
- 消息传递必须通过 `src/background/messageRouter.ts` 统一路由，不在各模块间直接 `chrome.runtime.sendMessage`。
- Content Script 只负责渲染 Overlay，不执行 ASR 或翻译逻辑。

### 代码风格

- 所有文件使用 **TypeScript strict 模式**（`"strict": true`）。
- 禁止使用 `any`，必须时使用 `unknown` + 类型收窄。
- 异步操作统一使用 `async/await`，禁止混用 `.then().catch()`。
- 错误处理：所有网络请求和 WASM 调用必须有 try/catch，错误信息必须透传到 UI。

---

## 文件操作规则

### 允许操作的目录

| 目录 | 权限 | 说明 |
|---|---|---|
| `apps/web-demo/` | 读写 | Web Demo 应用 |
| `apps/extension/` | 读写 | Chrome 插件 |
| `packages/` | 读写 | 所有共享包 |
| `*.md`（根目录） | 只读 | 不得修改 TARGET.md / AGENTS.md |

### 禁止操作

- 禁止修改 `TARGET.md` 和 `AGENTS.md`（如需更新，必须明确告知用户并由用户确认）。
- 禁止在 `packages/shared` 中添加运行时逻辑（只允许类型定义和常量）。
- 禁止删除任何已存在的 `index.ts` 导出文件而不同步更新所有 import。

---

## 验收命令速查

Agent 在完成各阶段任务后，必须运行对应命令并确认通过：

```bash
# Phase 0 — 基础设施
pnpm -r build                        # 所有包编译无报错
pnpm -r type-check                   # TypeScript 类型检查

# Phase 1 — Web Demo
pnpm --filter web-demo dev           # Dev server 启动无报错
pnpm --filter core test              # Pipeline 单元测试通过

# Phase 2 — Translator
pnpm --filter translator test        # Translator 单元测试通过

# Phase 3 — ASR
pnpm --filter asr-browser test       # ASR Provider 测试通过

# Phase 4 — Extension
pnpm --filter extension build        # Extension 构建无报错
# 然后在 Chrome 加载 apps/extension/dist 并手动验证
```

---

## 阶段完成标准（Checklist）

Agent 在宣布某阶段完成前，必须自查以下条目：

### Phase 0
- [ ] `packages/shared` 中定义了 `SourceLanguage` 和 `TargetLanguage`
- [ ] 所有包的 `tsconfig.json` 继承自根 `tsconfig.base.json`
- [ ] `pnpm -r build` 通过

### Phase 1
- [ ] MockASRProvider 覆盖 zh / en / ja 三种语言
- [ ] MockTranslator 覆盖 zh-CN / en 两种目标语言
- [ ] Pipeline 单元测试通过
- [ ] Web Demo 可在浏览器中运行 Mock 完整流程
- [ ] 无硬编码 API Key

### Phase 2
- [ ] OpenAICompatibleTranslator 实现 TranslatorProvider 接口
- [ ] System Prompt 集中在 `prompt.ts` 维护
- [ ] 网络失败时 UI 有错误提示
- [ ] API Key 不出现在源码中

### Phase 3
- [ ] BrowserASRProvider 实现 ASRProvider 接口
- [ ] 模型在 Web Worker 中运行（不阻塞主线程）
- [ ] 至少验证 en 和 ja 识别准确
- [ ] Mock 和真实 ASR 可通过同一接口互换

### Phase 4
- [ ] Extension 使用 Manifest V3
- [ ] `chrome.storage.local` 成功持久化 UserSettings
- [ ] tabCapture 在 offscreen document 中运行
- [ ] 在 Twitch / YouTube 页面完整验证端到端流程
- [ ] 无 Python / Docker / 本地服务依赖

---

## 遇到阻塞时的行为规范

当 Agent 遇到以下情况时，**必须停下来提问，不得自行决策**：

1. **功能边界不清晰**：用户需求超出 TARGET.md 范围，或与 TARGET.md 矛盾。
2. **技术方案有重大权衡**：例如 ASR 方案选型影响后续架构，需要用户确认。
3. **需要修改 AGENTS.md 或 TARGET.md**：必须由用户明确授权。
4. **破坏性变更**：删除已有模块、更改共享类型定义、重构 Pipeline 接口。
5. **无法通过验收**：运行了 3 次以上仍无法修复的编译/测试错误。

提问格式：
```
【阻塞】
问题描述：...
已尝试的方案：...
需要你决策的是：...
```

---

## 禁止行为（红线）

以下行为在任何情况下都不允许：

- ❌ 输出含有真实 API Key 的代码或配置
- ❌ 在 TARGET.md 范围外添加语言支持（如韩语、法语）
- ❌ 在 Mock 阶段引入真实网络依赖
- ❌ 在汇报"完成"时未运行验收命令
- ❌ 修改 `TARGET.md` 或 `AGENTS.md` 而未告知用户
- ❌ 在 `packages/shared` 中写运行时逻辑
- ❌ 绕过 Pipeline 接口直接调用 ASR 或 Translator 实现
