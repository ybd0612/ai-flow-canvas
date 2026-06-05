# UI 组件

## 概述

wxhb 的 UI 组件位于 `src/components/`，负责侧边栏、任务管理、设置和提示横幅。PropertiesPanel 位于 `src/canvas/panels/`。

## 文件位置

```
src/components/
├── Sidebar.tsx          # 左侧边栏
├── TaskManager.tsx      # 任务管理器
├── SettingsDialog.tsx   # 设置对话框
└── ApiKeyBanner.tsx     # API Key 提示横幅

src/canvas/panels/
└── PropertiesPanel.tsx  # 右侧属性编辑面板
```

---

## Sidebar — 左侧边栏

### 布局

```
┌─────────────────────┐
│ AI Canvas           │ ← Logo 区
│ Infinite Canvas...  │
├─────────────────────┤
│ 拖拽到画布            │ ← 标题
│ ┌─────────────────┐ │
│ │ 💬 提示词        │ │ ← PaletteItem（可拖拽）
│ │   自由文本输入    │ │
│ ├─────────────────┤ │
│ │ 🔤 文本生成      │ │
│ │   LLM 文本生成    │ │
│ ├─────────────────┤ │
│ │ 🖼 图像生成      │ │
│ │   AI 图像创作     │ │
│ ├─────────────────┤ │
│ │ 🎬 视频生成      │ │
│ │   AI 视频生成     │ │
│ ├─────────────────┤ │
│ │ 📤 上传图片      │ │
│ │   本地图片上传    │ │
│ └─────────────────┘ │
├─────────────────────┤
│ 任务管理器区域        │ ← TaskManager 组件
├─────────────────────┤
│ ⚙ 设置              │ ← Footer 按钮
│ 🗑 清空画布          │
└─────────────────────┘
```

### PaletteItem 拖拽实现

```typescript
const onDragStart = (e: DragEvent) => {
  e.dataTransfer.setData("application/wxhb-node", nodeType);
  e.dataTransfer.effectAllowed = "move";
};
```

CanvasWorkspace 的 `onDrop` 读取此数据创建节点。

### 画布操作

- **设置** → 打开 SettingsDialog
- **清空画布** → 有节点时需确认 → `clearAll()`

---

## TaskManager — 任务管理器

### 功能

- 保存当前画布为命名任务
- 在任务间切换（自动保存当前画布）
- 重命名 / 删除任务
- 历史版本查看和恢复

### 布局

```
┌──────────────────────────┐
│ 💾 任务 / 当前任务名  ▼   │ ← 可折叠标题
├──────────────────────────┤
│ [输入任务名称...] [+新建] │ ← 操作栏
│ 点击切换（自动保存）       │
│ ┌──────────────────────┐ │
│ │ 📂 任务A (5) [H:3]  │ │ ← TabButton
│ │ 📂 任务B (3)  ★激活  │ │
│ └──────────────────────┘ │
└──────────────────────────┘
```

### TabButton

每个任务标签显示：
- 文件夹图标 + 名称 + 节点数
- 历史版本数（可展开查看）
- Hover 显示：重命名 / 删除按钮

### 切换流程

1. 捕获当前画布快照（`captureSnapshot()`）
2. 更新当前任务的 canvasData
3. 加载目标任务的 canvasData 到画布
4. 设置 activeTaskId

### 历史恢复

1. 捕获当前快照并保存
2. 从 history[index] 恢复 canvasData
3. 设置 activeTaskId

---

## PropertiesPanel — 右侧属性面板

### 概述

选中节点时在画布右侧显示，提供节点的完整属性编辑、执行日志查看和输出预览。

### 文件位置

`src/canvas/panels/PropertiesPanel.tsx`

### 显示条件

- 选中节点时显示（`selectedNodeId !== null`）
- 点击画布空白处或关闭按钮隐藏

### 布局

```
┌──────────────────────────┐
│ 节点标签    ▶ ↻ ✕        │ ← Header（sticky）
├──────────────────────────┤
│ LABEL                    │
│ [节点标签输入框]           │
├──────────────────────────┤
│ 节点类型特有字段           │ ← 按节点类型动态渲染
│ （见下方各类型详情）       │
├──────────────────────────┤
│ 日志 (N)                 │ ← 可折叠日志区
│ ┌──────────────────────┐ │
│ │ 12:30:01 — 执行开始   │ │
│ │ 12:30:03 — 生成成功   │ │
│ └──────────────────────┘ │
└──────────────────────────┘
```

### Header 操作

| 按钮 | 功能 |
|------|------|
| ▶ Play | 运行此节点（`run({ startNodeId })`） |
| ↻ RotateCcw | 重置所有节点执行状态 |
| ✕ X | 关闭面板 |

### 节点类型特有字段

#### TextNodeFields

- Model 下拉（从 `MODEL_REGISTRY.text` 读取）
- Prompt textarea
- System Prompt textarea
- Temperature 数字输入
- Max Tokens 数字输入
- 文本输出预览区（显示 `output` 字段）

#### ImageNodeFields

- Model 下拉（从 `MODEL_REGISTRY.image` 读取）
- Prompt textarea
- Negative Prompt textarea（当前数据类型未定义此字段，预留 UI）
- Size 下拉
- Guidance Scale 数字输入（当前数据类型未定义此字段，预留 UI）
- Seed 数字输入（当前数据类型未定义此字段，预留 UI）
- 输入图片 URL / 已连接图片预览
- 输出图片预览

#### VideoNodeFields

- Prompt textarea
- System Prompt textarea
- 分辨率 W × H
- FPS / Frames
- Mode 选择（normal / keyframe）
- Seed 数字输入
- 任务 ID / 进度显示
- 视频输出播放器

#### PromptNodeFields

- System Prompt textarea
- Output Modality 下拉（text / image / video）

#### UploadNodeFields

- 文件信息（名称、类型）
- 图片预览
- 无图片时提示"暂无图片"

### 日志区

- 可折叠（details/summary）
- 显示日志条数
- 每条日志：时间戳 + 消息
- 最大高度 160px，溢出滚动

---

## SettingsDialog — 设置对话框

### 功能

- API Key 配置（支持显示/隐藏切换）
- API Base URL 配置
- 连接测试（发送 "ping-ok" 请求验证）
- 语言切换（zh / en）
- Toast 通知

### 动画

使用 Framer Motion：
- 背景淡入淡出
- 对话框缩放弹出
- Toast 从顶部滑入

### 连接测试

发送一个简单的 chat/completions 请求：
```json
{
  "model": "agnes-2.0-flash",
  "messages": [{ "role": "user", "content": "Reply with exactly: ping-ok" }],
  "temperature": 0,
  "max_tokens": 32
}
```

响应中包含 "ping-ok" → 成功，否则显示响应预览。

### 存储

- 设置保存到 `settingsStore` → localStorage
- API Key 存储在浏览器本地，不会上传

---

## ApiKeyBanner — API Key 提示横幅

### 行为

- 当 API Key 为空时，在画布顶部显示警告横幅
- 首次访问时自动打开 SettingsDialog（通过 `autoOpened` ref 防止重复）
- API Key 配置后自动隐藏（返回 null）

### 内容

- ⚠️ 警告图标 + 提示文本
- "Open Settings" 按钮
