# Change: 添加模板字段拖拽排序功能

## Why
用户在创建和编辑模板时，经常需要调整字段的显示顺序。当前只能通过删除字段再重新添加来调整顺序，用户体验很差。提供拖拽排序功能可以显著提升模板编辑的易用性。

## What Changes
- 在模板创建和编辑页面添加字段拖拽排序功能
- 添加基本的视觉反馈（拖拽手柄、拖拽状态指示器）
- 保持字段顺序在记录创建和编辑中的一致性

## Impact
- Affected specs: core
- Affected code: password-memo-browser/src/pages/CreateTemplatePage.tsx, password-memo-browser/src/pages/EditTemplatePage.tsx
- 新增依赖: @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities

## Technical Considerations
- 使用 @dnd-kit 库实现拖拽功能
- 字段顺序将影响记录创建和编辑页面的字段显示顺序
- 需要处理拖拽过程中的表单状态管理

## Core 接口说明

**重要确认：Core 层不需要任何修改**

根据对现有 [`DataManager.updateTemplate()`](password-memo-core/src/DataManager.ts:525) 接口的分析：

```typescript
async updateTemplate(
  templateId: string,
  updates: { name?: string; fields?: TemplateField[] }
): Promise<void>
```

该接口已经支持传入完整的 `fields` 数组进行一次性更新。因此：

1. **拖拽状态管理**：字段拖拽过程中的顺序变化仅在 UI 层维护，不涉及 Core 层
2. **数据保存策略**：用户完成拖拽操作后，调用一次 [`updateTemplate()`](password-memo-core/src/DataManager.ts:525) 传入重新排序后的完整 `fields` 数组
3. **接口兼容性**：现有的 Core 接口完全满足需求，无需新增或修改任何 API

这种设计确保了：
- Core 层保持简洁，只负责最终的数据持久化
- UI 层拥有完整的拖拽交互控制权
- 避免了频繁的 Core 层调用，提升性能
- 保持了现有架构的清晰性

## 实现状态

**✅ 已完成** - 所有任务已成功实现并验证。

### 实现总结
- **依赖包**: @dnd-kit/core, @dnd-kit/sortable, @dnd-kit/utilities 成功安装
- **组件**: 创建了具有完整拖拽功能的 `DraggableField` 和 `DragDropContainer` 组件
- **页面**: `CreateTemplatePage` 和 `EditTemplatePage` 已重构使用拖拽组件
- **一致性**: 所有记录相关页面（CreateRecordPage, EditRecordPage, RecordsPage）自动遵循模板字段顺序
- **视觉反馈**: 实现了拖拽手柄、拖拽预览、放置指示器和平滑动画
- **用户体验**: 直观的拖拽界面，具有视觉反馈和无冲突交互

### 技术成就
- ✅ 使用 @dnd-kit 完全集成拖拽功能
- ✅ 通过现有 Core API 保持模板字段顺序持久化
- ✅ 所有相关页面字段顺序一致
- ✅ 视觉反馈和用户体验增强
- ✅ 无需修改 Core 层（按设计）
- ✅ 所有表单状态与拖拽操作正确同步

### 验证结果
- `tasks.md` 中所有任务标记为已完成
- 拖拽功能已测试并按规范工作
- 字段顺序一致性在所有页面得到验证
- 未引入破坏性更改到现有功能