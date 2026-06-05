# 连线样式

## 概述

wxhb 使用自定义 `TypedEdge` 组件渲染连线，根据源端口类型自动着色。

## 文件位置

- `src/canvas/edges/TypedEdge.tsx` — 自定义边组件
- `src/canvas/edges/index.ts` — edgeTypes 注册表

## 实现细节

### 颜色映射

基于 `sourceHandleId` 选择颜色：

| sourceHandleId | 颜色 | 色值 |
|----------------|------|------|
| `text-out` | 天蓝 | `#38bdf8` |
| `text-in` | 天蓝 | `#38bdf8` |
| `prompt-out` | 翡翠绿 | `#34d399` |
| `image-in` | 紫色 | `#a78bfa` |
| `image-out` | 紫色 | `#a78bfa` |
| `video-in` | 琥珀 | `#fbbf24` |
| `video-out` | 琥珀 | `#fbbf24` |
| 兜底 | 灰色 | `#64748b` |

### 路径算法

使用 `getSmoothStepPath()` 生成直角折线路径：
- `borderRadius: 16` — 圆角半径
- `strokeWidth: 1.5`

### 注册

```typescript
// edges/index.ts
export const edgeTypes = {
  typed: TypedEdge,
};
```

在 CanvasWorkspace 中通过 `defaultEdgeOptions` 设置新连线默认使用 `typed` 类型并开启动画。

### memo 优化

`TypedEdge` 使用 `memo` 包裹，避免不必要的重渲染。
