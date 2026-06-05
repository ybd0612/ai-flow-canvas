# 画布工作区

## 概述

画布工作区是 wxhb 的核心 UI 区域，基于 React Flow v12 实现无限画布。用户在此拖拽添加节点、连线编排工作流、执行和查看结果。

## 文件位置

- `src/canvas/CanvasWorkspace.tsx` — 主画布组件
- `src/canvas/validateConnection.ts` — 连线校验
- `src/canvas/types.ts` — 节点数据类型和配置

## 架构

### 双层组件结构

```
CanvasWorkspace          ← ReactFlowProvider 包裹层
  └─ CanvasInner         ← 实际画布逻辑，使用 useReactFlow()
```

`ReactFlowProvider` 必须包裹 `useReactFlow()` 的调用者，因此分为外层 Provider 和内层逻辑两部分。

### 状态同步

画布维护两套节点/边状态：

| 状态 | 存储 | 用途 |
|------|------|------|
| Zustand store (`canvasStore`) | IndexedDB 持久化 | 源 of truth，跨会话保存 |
| React Flow local state (`useNodesState`) | 内存 | React Flow 渲染驱动 |

同步方向通过 `syncingFromStore` / `syncingFromLocal` 两个 ref 防止无限循环：
- **store → local**：当 store 被外部修改（如工作流 runner 更新节点状态），通过 `useEffect` 同步到 React Flow
- **local → store**：当用户拖拽/连线改变节点时，同步回 store 并触发自动保存

### 自动保存到 Task

每当 nodes 或 edges 变化，如果当前有激活的 Task，会自动将画布快照保存到 taskStore。

完整的自动保存防护链：

1. `canvasLoadInProgress` 标志 — 当 `loadSnapshot()` 被调用时设为 `true`，200ms 后自动重置
2. CanvasWorkspace 的 `useEffect` 在检测到此标志时跳过 auto-save
3. 防止从 Task 恢复画布时触发 auto-save 覆盖刚加载的数据

## 拖拽添加节点

### 流程

1. **Sidebar** 中的 `PaletteItem` 设置 `dataTransfer`：`application/wxhb-node` → nodeType
2. **CanvasWorkspace** 监听 `onDragOver`（允许 drop）和 `onDrop`
3. `onDrop` 中：
   - 读取 `dataTransfer.getData("application/wxhb-node")`
   - 通过 `screenToFlowPosition()` 将屏幕坐标转换为画布坐标
   - 从 `NODE_FACTORIES` 获取默认数据
   - 生成唯一 ID：`${type}__${counter}`
   - 调用 `addStoreNode()` 写入 store + `setNodes()` 更新 local

### NODE_FACTORIES

```typescript
const NODE_FACTORIES = {
  prompt: createDefaultPromptNodeData,
  text: createDefaultTextNodeData,
  image: createDefaultImageNodeData,
  video: createDefaultVideoNodeData,
  upload: createDefaultUploadNodeData,
};
```

## 连线处理

### onConnect 回调

1. 调用 `validateCanvasConnection()` 校验连接合法性
2. 校验通过后创建 TypedEdge：
   - `type: "typed"` — 使用自定义 TypedEdge 组件
   - `animated: true` — 默认带动画
   - ID 格式：`edge__${timestamp}_${random}`

### isValidConnection

React Flow 的 `isValidConnection` prop 也绑定同一个校验函数，确保拖拽过程中实时反馈连接是否合法。

## 节点选中

- `onNodeClick` → 设置 `selectedNodeId`
- `onPaneClick` → 清除选中，取消边高亮
- `onEdgeClick` → 清除节点选中，高亮边
- 选中节点时右侧显示 `PropertiesPanel`

## 键盘操作

- `Delete` / `Backspace` — 删除选中的节点或连线

## 画布 UI 元素

| 元素 | 位置 | 来源 |
|------|------|------|
| 网格背景 | 画布内 | `<Background>` 组件，由 `settingsStore.showGrid` 控制 |
| 缩略图 | 画布内 | `<MiniMap>` 组件，由 `settingsStore.showMinimap` 控制 |
| 缩放控件 | 画布内 | `<Controls>` 组件（showZoom, showFitView, showInteractive=false） |
| 运行按钮 | 底部居中 | 自定义浮动按钮，调用 `handleRunAll` |
| 属性面板 | 右侧 | `<PropertiesPanel>` |

## 快照恢复

`canvasStore.loadSnapshot()` 用于从 Task 恢复画布状态：

1. 设置 `canvasLoadInProgress = true`
2. 调用 `set()` 更新 nodes / edges / viewport
3. 200ms 后自动重置 `canvasLoadInProgress = false`

CanvasWorkspace 的 auto-save useEffect 检测此标志，恢复期间跳过保存。
