## Context
用户在创建和编辑模板时需要调整字段顺序，当前只能通过删除再添加的方式调整，用户体验差。需要提供直观的拖拽排序功能来改善用户体验。

## Goals / Non-Goals
- Goals:
  - 提供直观的字段拖拽排序功能
  - 支持鼠标和触摸操作
  - 保持字段顺序在所有相关页面中的一致性
  - 提供基本的视觉反馈
- Non-Goals:
  - 不改变模板字段的数据结构
  - 不影响现有的模板功能（创建、编辑、删除）
  - 不支持跨模板的字段拖拽

## Decisions

### 技术选型：@dnd-kit
- Decision: 使用 @dnd-kit 库实现拖拽功能
- 理由：
  - 现代化的拖拽库，支持 React 18+
  - 原生支持触摸设备，适合浏览器扩展环境
  - 模块化设计，按需引入，包体积小
  - 比 react-beautiful-dnd 更活跃的维护和更好的 TypeScript 支持

### 拖拽交互设计
- Decision: 使用拖拽手柄而非整个字段可拖拽
- 理由：
  - 避免与字段编辑操作冲突
  - 更明确的拖拽意图指示
  - 减少误触发拖拽操作

### 状态管理策略
- Decision: 在组件内部管理拖拽状态，通过回调函数通知父组件
- 理由：
  - 保持组件的独立性
  - 避免全局状态复杂化
  - 便于维护

## Risks / Trade-offs

### 兼容性风险
- Risk: 某些浏览器环境可能不支持拖拽 API
- Mitigation: 提供降级方案，使用上下移动按钮作为备选

### 用户体验权衡
- Trade-off: 拖拽手柄占用额外空间
- Balance: 手柄设计紧凑，减少视觉干扰

## Migration Plan

### 阶段 1：基础设施
1. 安装和配置 @dnd-kit 依赖
2. 创建基础的拖拽组件
3. 添加必要的样式和类型定义

### 阶段 2：页面集成
1. 重构 CreateTemplatePage
2. 重构 EditTemplatePage
3. 确保表单状态正确同步

### 阶段 3：一致性保证
1. 更新所有使用模板字段的页面
2. 确保字段顺序一致性
3. 添加相关测试

### 阶段 4：完成和验证
1. 确保所有页面字段顺序一致
2. 基本功能验证

## Open Questions
- 是否需要支持批量字段操作（如多选后一起移动）？ 不需要

## Component Architecture

```
DragDropContainer
├── DragOverlay (拖拽时的浮动层)
├── DraggableField (可拖拽字段)
│   ├── DragHandle (拖拽手柄)
│   └── FieldContent (字段内容)
└── DropIndicator (放置指示器)
```

## Data Flow
1. 用户点击并按住拖拽手柄
2. DraggableField 触发 dragStart 事件
3. DragOverlay 显示被拖拽字段的预览
4. 用户移动鼠标/手指到目标位置
5. DropIndicator 显示放置位置
6. 用户释放，触发 dragEnd 事件
7. 更新字段顺序，重新渲染列表