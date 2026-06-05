# Prompt 节点

## 概述

Prompt 节点是自由文本输入源，用于向下游提供提示词。在工作流执行时，它**会调用 LLM**（与 Text 节点共用同一执行分支），而非仅作为数据传递。

## 文件位置

`src/canvas/nodes/PromptNode.tsx`

## 数据类型

```typescript
interface PromptNodeData extends BaseNodeData {
  prompt: string;              // 用户输入的提示词文本
  systemPrompt?: string;       // 可选的系统提示词（在 PropertiesPanel 编辑）
  outputModality: Modality;    // 输出模态提示："text" | "image" | "video"
}
```

## 默认值

```typescript
{
  label: "Prompt",
  prompt: "",
  systemPrompt: "",
  outputModality: "text",
  executionStatus: "idle",
  executionLogs: [],
}
```

## 界面

### 节点卡片

- **图标**：💬 MessageSquare（翡翠绿 `text-emerald-400`）
- **边框**：`border-emerald-800/60`
- **内容**：一个 `textarea` 输入提示词
- **运行按钮**：不显示（`runnable={false}`，通过 NodeShell 控制）

### PropertiesPanel 扩展字段

- **System Prompt** — 可选的系统提示词 textarea
- **Output Modality** — 下拉选择 `text` / `image` / `video`

## Handle 配置

| Handle ID | 方向 | 数据类型 | 位置 |
|-----------|------|----------|------|
| `prompt-out` | source | text | 右侧 |

## 工作流执行

### 执行行为

在 `useWorkflowRunner.ts` 中，Prompt 节点与 Text 节点共用 `case "prompt": case "text":` 分支。执行时：

1. 收集上游 textInputs（如果有上游 text 连接），拼接后作为 prompt
2. 如果无上游输入，使用节点自身的 `prompt` 字段
3. 如果 prompt 为空 → 抛出 "No prompt text available" 错误
4. 调用 `callTextAPI()`（`/chat/completions`）
5. 结果写入节点 `output` 字段

调用参数：
- `model`：使用默认 `"agnes-2.0-flash"`（Prompt 节点无 modelId 字段）
- `temperature`：使用默认 `0.7`
- `maxTokens`：使用默认 `1024`
- `systemPrompt`：使用节点的 `systemPrompt`（如果有）

### 上游输入收集

`gatherInputs()` 会将上游连接的 text 输出收集到 `textInputs` 数组，与 Prompt 自身的 prompt 合并（上游优先）。
