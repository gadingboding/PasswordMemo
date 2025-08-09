# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

这是一个基于 TypeScript 构建的安全密码管理器，使用 pnpm 工作区作为单体仓库。项目采用模块化架构，包含三个主要包：

- **core** (`password-manager-core`): 提供加密、保险库管理和同步功能的核心库
- **extension** (`password-manager-extension`): 使用 React + Vite 构建的浏览器扩展
- **flow_test** (`flow-test`): 综合集成测试套件

## 开发命令

### 单体仓库命令
```bash
# 构建所有包
pnpm build

# 测试所有包
pnpm test

# 检查所有包
pnpm lint

# 构建特定包
pnpm build:core          # 构建核心库
pnpm build:extension     # 构建浏览器扩展

# 开发模式
pnpm dev:web            # Web 开发服务器
pnpm dev:extension      # 扩展监视模式
```

### 核心库命令 (core/)
```bash
pnpm build              # TypeScript 编译
pnpm build:watch        # 监视模式编译
pnpm test               # Jest 单元测试
pnpm test:watch         # Jest 监视模式
pnpm test:coverage      # Jest 覆盖率测试
pnpm lint               # ESLint 检查
pnpm lint:fix           # 自动修复 ESLint 问题
pnpm format             # Prettier 格式化
pnpm dev                # ts-node 执行
```

### 集成测试命令 (flow_test/)
```bash
# 运行所有集成测试
pnpm test:all

# 运行特定测试类别
pnpm test:unified-workflow    # 统一工作流测试
pnpm test:webdav-sync        # WebDAV 同步测试
pnpm test:vault-save-load    # 保险库保存加载测试
pnpm test:kdf-config         # 密钥派生配置测试
pnpm test:salt-update        # 盐值更新测试
```

## 架构概览

### 核心库结构 (core/src/)

**主入口**: `index.ts` - 导出统一的 `PasswordManager` 接口和各个模块

**核心模块**:
- **PasswordManager** (`passwordManager.ts`): 统一 API 接口，协调所有功能
- **VaultManager** (`vault-manager.ts`): 保险库操作、记录管理、模板和标签
- **CryptographyEngine** (`crypto-engine.ts`): 使用 libsodium 的加密/解密 (AES-GCM + Argon2id)
- **SyncManager** (`sync-manager.ts`): WebDAV 同步与冲突解决 (最后写入获胜)
- **ConfigurationManager** (`configuration-manager.ts`): 设置和加密配置存储
- **EnvironmentManager** (`environment-manager.ts`): 跨平台存储抽象层
- **KDFManager** (`kdf-manager.ts`): 密钥派生函数管理
- **RemoteStorage** (`remoteStorage.ts`): WebDAV 远程存储操作

### 存储适配器模式

项目使用存储适配器模式实现跨平台兼容性：

- **IStorageAdapter 接口**: 抽象存储操作
- **浏览器环境**: LocalStorage 适配器实现
- **Node.js 环境**: FileSystem 适配器实现
- **统一 API**: 相同接口在不同环境下工作

### 类型系统 (core/src/types/)

- **vault.ts**: 核心数据结构 (Vault, VaultRecord, VaultTemplate, Label)
- **crypto.ts**: 加密类型 (EncryptedData, BinaryData 等)
- **kdf.ts**: 密钥派生配置类型
- **sync.ts**: 同步相关类型

## 安全架构

- **加密**: libsodium-wrappers 与 AES-GCM + Argon2id
- **主密码**: 永不存储，只保存派生的密钥
- **PIN 解锁**: 安全会话管理，提供便利性
- **长度标准化**: 填充防止时序攻击
- **墓碑模式**: 软删除确保同步传播

## 同步策略

- **记录级版本控制**: 每条记录都有 `last_modified` 时间戳
- **冲突解决**: 基于时间戳的最后写入获胜
- **仅本地记录**: 可选择将记录排除在同步之外
- **WebDAV 集成**: 通过标准 WebDAV 协议进行远程存储

## 开发模式

### 代码风格
- **仅使用 ES6 模块** (不使用 CommonJS)
- **TypeScript 严格模式** 已启用
- **路径别名**: `@/*` 映射到 `src/*`
- **代码中不使用表情符号** (根据 AGENTS.md)

### 包依赖
- **Core**: libsodium-wrappers, uuid, webdav
- **Extension**: React 19, Zustand, Tailwind CSS, Vite
- **工作区依赖**: 扩展使用 `workspace:*` 引用核心库

### 测试策略
- **单元测试**: Jest 用于核心库组件
- **集成测试**: flow_test/ 中的综合工作流模拟
- **测试结果**: 存储在 `flow_test/test-results/`
- **数据管理**: 自定义测试数据工具与清理

## 关键配置文件

- **pnpm-workspace.yaml**: 单体仓库工作区配置
- **core/tsconfig.json**: 核心库 TypeScript 配置
- **password-manager-extension/vite.config.ts**: Vite 构建配置
- **password-manager-extension/eslint.config.ts**: 扩展 ESLint 配置
- **AGENTS.md**: 开发指南和代理指令

## git规范
每个分支需要加上前缀，用来区别分支的作用：
feat: 新功能
fix: 修复bug
style: 代码格式优化
refactor: 重构
chore: 其他不好分类的情况
前缀作为分支的目录， 分支名称的不同单词之间使用下划线链接，一个新功能分支类似于：`feat/add_new_feature`。
