# 节点系统

## 概述

wxhb 有 5 种自定义节点类型，每种对应一个 AI 模态或辅助功能。所有节点共享 `NodeShell` 公共外壳组件和 `StatusBadge` 状态指示器。

## 文件位置

```
src/canvas/nodes/
├── index.ts          # nodeTypes 注册表
├── NodeShell.tsx     # 公共节点外壳
├── StatusBadge.tsx   # 执行状态徽章
├── PromptNode.tsx    # 提示词输入
├── TextNode.tsx      # 文本生成
├── ImageNode.tsx     # 图像生成
├── VideoNode.tsx     # 视频生成
└── UploadNode.tsx    # 图片上传
```

## 节点类型注册

```typescript
// nodes/index.ts
export const nodeTypes = {
  prompt: PromptNode,
  text: TextNode,
  image: ImageNode,
  video: VideoNode,
  upload: UploadNode,
};
```

React Flow 通过 `nodeTypes` prop 将字符串类型映射到组件。

## NodeShell — 公共外壳

### 功能

所有节点复用 `NodeShell` 提供统一的视觉框架：

- **标题栏** — 图标 + 标签 + StatusBadge + 操作按钮（运行/删除）
- **内容区** — children（各节点自定义内容）
- **错误显示** — 当 `errorMessage` 存在时显示红色错误框

### Props

| 属性 | 类型 | 说明 |
|------|------|------|
| `nodeId` | string | 节点 ID |
| `label` | string | 显示名称 |
| `icon` | LucideIcon | 标题栏图标 |
| `iconColor` | string | 图标 Tailwind 颜色类 |
| `borderColor` | string | 边框 Tailwind 颜色类 |
| `status` | NodeExecutionStatus | 执行状态 |
| `errorMessage?` | string | 错误信息 |
| `children` | ReactNode | 节点主体内容 |
| `runnable?` | boolean | 是否显示运行按钮（默认 true） |

### 各节点视觉配色

| 节点 | iconColor | borderColor |
|------|-----------|-------------|
| Prompt | `text-emerald-400` | `border-emerald-800/60` |
| Text | `text-sky-400` | `border-sky-800/60` |
| Image | `text-violet-400` | `border-violet-800/60` |
| Video | `text-amber-400` | `border-amber-800/60` |
| Upload | `text-rose-400` | `border-rose-800/60` |

### 单节点运行

点击标题栏的 ▶ 按钮，调用 `run({ startNodeId })` 触发从该节点开始的局部执行（仅执行该节点及其下游）。

### 删除

点击 🗑 按钮，调用 `removeNode(nodeId)` 从 store 中移除节点及其相关连线。

## StatusBadge — 执行状态指示器

### 状态定义

| 状态 | 图标 | 颜色 | 背景 |
|------|------|------|------|
| `idle` | ○ | `text-slate-500` | `bg-slate-800` |
| `pending` | ↻ (spin) | `text-amber-400` | `bg-amber-950/50` |
| `success` | ✓ | `text-emerald-400` | `bg-emerald-950/50` |
| `failed` | ✕ | `text-red-400` | `bg-red-950/50` |

`pending` 状态的图标带 `animate-spin` 旋转动画。

## 节点数据模型

所有节点数据继承 `BaseNodeData`：

```typescript
interface BaseNodeData extends Record<string, unknown> {
  label: string;                       // 显示名称
  executionStatus: NodeExecutionStatus; // 执行状态
  executionLogs: NodeExecutionLog[];   // 执行日志
  errorMessage?: string;               // 错误信息
}
```

通过判别联合 `AnyNodeData` 区分各节点的具体数据。

## 节点实现模式

每个节点组件遵循相同模式：

1. 使用 `memo` 包裹避免重渲染
2. 从 `canvasStore` 获取 `updateNodeData`
3. 从 `data` prop 解构出节点特有数据
4. 使用 `NodeShell` 作为外壳
5. 清单节点特有的 UI 控件
6. 在底部放置 Handle 端口

```typescript
function XxxNodeInner({ id, data }: NodeProps) {
  const d = data as unknown as XxxNodeData;
  const updateNodeData = useCanvasStore((s) => s.updateNodeData);
  
  return (
    <NodeShell nodeId={id} label={d.label} ...>
      {/* 节点特有内容 */}
      <Handle type="target" position={Position.Left} id="xxx-in" />
      <Handle type="source" position={Position.Right} id="xxx-out" />
    </NodeShell>
  );
}
export const XxxNode = memo(XxxNodeInner);
```
