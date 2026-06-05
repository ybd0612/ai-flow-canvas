# 工作流执行引擎

## 概述

工作流执行引擎负责按拓扑顺序执行画布上的节点，支持循环检测、局部执行和级联失败。

## 文件位置

`src/canvas/hooks/useWorkflowRunner.ts`

## 核心算法

### 1. 循环检测 — DFS 白/灰/黑着色

```typescript
function detectCycle(nodes, edges): { hasCycle: boolean; cyclePath: string[] }
```

- **白色 (0)** — 未访问
- **灰色 (1)** — 正在访问（在当前 DFS 栈中）
- **黑色 (2)** — 已完成

当 DFS 遇到灰色节点时，说明发现环路。通过 parent 指针回溯得到环路路径。

如果检测到循环，引擎拒绝执行并返回 cyclePath 供 UI 显示。

### 2. 拓扑排序 — Kahn 算法 (BFS)

```typescript
function topoSort(nodes, edges): string[]
```

1. 计算每个节点的入度
2. 将入度为 0 的节点入队
3. BFS：出队一个节点 → 加入排序结果 → 其邻居入度减 1 → 入度为 0 的入队
4. 最终得到执行顺序

### 3. 下游发现 — BFS

```typescript
function findDownstream(startId, edges): Set<string>
```

从指定节点出发，BFS 遍历所有下游节点。用于局部执行：只执行 startNodeId 及其下游。

### 4. 上游输入收集

```typescript
function gatherInputs(nodeId, edges): { textInputs: string[]; imageInputs: string[]; videoInputs: string[] }
```

遍历所有指向 nodeId 的边，从 **实时 store**（`useCanvasStore.getState()`）读取上游节点数据，按源节点类型分类收集：

| 源节点类型 | 收集字段 | 归入 |
|-----------|---------|------|
| `prompt` | `prompt` | textInputs |
| `text` | `output` | textInputs |
| `image` | `outputUrl` | imageInputs |
| `video` | `outputUrl` | videoInputs |
| `upload` | `base64Data` | imageInputs |

关键实现细节：每次执行时重新从 store 读取（而非使用缓存），确保同一轮执行中先完成的上游节点的输出能被下游读到。

## 执行流程

### 入口

```typescript
const { run, cancel } = useWorkflowRunner();
```

- `run(opts?)` — 启动执行（自动取消上一次未完成的执行）
- `cancel()` — 通过 AbortController 取消

### 防重入

通过 `isRunningRef` 防止并发执行。如果已有工作流在运行，立即返回 `{ success: false, error: "A workflow is already running." }`。

### runWorkflow 内部流程

1. **前置检查**
   - 检查 API Key 是否配置
   - 检查是否有节点
   - 循环检测
2. **确定执行范围**
   - 如果指定了 `startNodeId`，用 `findDownstream()` 只取相关节点（并将 startNodeId 本身加入集合）
   - 否则执行全部节点
3. **拓扑排序** → 对全部节点排序，再过滤出执行范围内的节点
4. **重置执行状态** — 对范围内所有节点调用 `cascadeNodeStates` 重置为 idle
5. **逐节点执行**

### 节点执行分支

#### Prompt 节点

**与 Text 节点共用同一执行分支**（`case "prompt": case "text":`）。Prompt 节点也会调用 `callTextAPI()`：

1. 收集上游文本输入（如果有）作为 prompt；否则使用节点自身的 `prompt` 字段
2. 调用 `/chat/completions` 接口
3. 结果写入节点 `output` 字段

这意味着 Prompt 节点不只是数据源——当它被单独运行或作为工作流的起点时，会实际发起 LLM 调用。

#### Text 节点

与 Prompt 共用同一分支，额外使用 `modelId`、`temperature`、`maxTokens` 参数。

#### Image 节点

```
gatherInputs → callImageAPI() → 更新 outputUrl
```

#### Video 节点（异步）

```
gatherInputs → callVideoCreateAPI() → 轮询 → 更新 outputUrl
```

轮询参数：
- 间隔：3 秒
- 超时：10 分钟
- 支持 AbortController 取消

#### Upload 节点

没有对应的 case 分支。Upload 节点在拓扑排序中仍然会被遍历到，但由于没有 `case "upload"` 会走到 `default` 分支抛出 `Unknown node type` 错误。

> **注意**：当前实现中 Upload 节点不应出现在需要执行的工作流路径中。它仅作为数据源，其 `base64Data` 通过 `gatherInputs()` 被下游 Image 节点读取。如果 Upload 节点在拓扑排序中排在某个需要执行的节点之前，运行器会报错。实际上由于 Upload 节点没有输入 Handle，它不会出现在任何下游依赖链中。

### REST 调用层

引擎内部实现了独立的 REST 调用函数（不依赖 AgnesAdapter）：

| 函数 | 说明 |
|------|------|
| `callTextAPI()` | POST `/chat/completions`，返回 `TextResult` |
| `callImageAPI()` | POST `/images/generations`，返回 `ImageResult` |
| `callVideoCreateAPI()` | POST `/videos`，返回 taskId |
| `callVideoPollAPI()` | GET `/videos/{taskId}`，返回 `VideoTaskStatus` |

这些函数直接通过 `fetch` 调用 Agnes API，使用 `resolveBaseUrl()` 清理 URL。

> **架构说明**：当前 `useWorkflowRunner` 和 `AgnesAdapter` 存在功能重复。两套实现分别位于 runner 和 adapter 中，runner 的版本是实际执行路径。如果要接入新 Provider，需要修改 runner 中的调用函数或重构为统一调用 adapter。

### 错误处理

#### 级联失败

当节点执行失败时：
1. 标记当前节点为 failed + 设置 errorMessage
2. 记录 `failedNodeId` 和 `failureMessage`
3. 后续节点检查 `failedNodeId` 是否存在 → 如果存在，标记为 failed + "Upstream dependency ... failed"
4. 错误信息包含上游失败节点的 ID

注意：级联失败是**逐节点串行**处理的，不是 BFS 批量标记。在 `for (const nodeId of execOrder)` 循环中，一旦 `failedNodeId` 被设置，后续所有节点都会被标记。

#### 错误日志

每个失败操作都通过 `cascadeNodeStates()` 写入 executionLogs。

### 执行结果

```typescript
export interface WorkflowRunResult {
  success: boolean;
  executedNodeIds: string[];
  failedNodeId?: string;
  error?: string;
}
```

## 选项

```typescript
export interface WorkflowRunOptions {
  startNodeId?: string;  // 局部执行起点
  signal?: AbortSignal;  // 取消信号
}
```

## 常量

| 常量 | 值 | 说明 |
|------|-----|------|
| `VIDEO_POLL_INTERVAL_MS` | 3000 | 视频轮询间隔 |
| `VIDEO_POLL_TIMEOUT_MS` | 600000 (10min) | 视频轮询超时 |
