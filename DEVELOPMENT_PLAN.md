# 加密工具内核开发方案

本文档旨在根据内核设计规范，制定一个详细、可执行的开发计划。该计划将遵循使用 `pnpm` 作为包管理器、优先选用成熟第三方库以及构建适配层以支持多环境（浏览器、Node.js）的原则。

## 1. 项目初始化与基础架构

### 1.1. 包管理器
我们将使用 `pnpm` 进行依赖管理，以利用其高效的磁盘空间利用率和快速的安装速度。

### 1.2. 项目结构
项目将基于成熟的 TypeScript 库模板（例如 `typescript-starter` 或类似的模板）进行初始化，以快速获得一个包含 Jest 测试、ESLint、Prettier 和自动化构建脚本的标准化开发环境。我们将在此基础上进行调整，以符合我们的模块化设计。

```
/
├── src/
│   ├── core/                     # 内核主逻辑
│   │   ├── auth/                 # 认证与会话管理器
│   │   ├── crypto/               # 加密引擎
│   │   ├── vault/                # 保险库管理器
│   │   ├── sync/                 # 同步协调器
│   │   ├── config/               # 配置管理器
│   │   └── index.ts              # 内核主入口，组合并导出模块
│   ├── adapters/                 # 环境适配层
│   │   ├── storage/              # 存储适配器 (LocalStorage, FileSystem, etc.)
│   │   ├── types.ts              # 适配器接口定义
│   │   └── index.ts
│   ├── types/                    # 核心类型定义
│   │   ├── vault.ts              # Vault、Record等数据结构
│   │   └── index.ts
│   └── index.ts                  # 项目总入口
├── test/                         # 测试文件
├── package.json
├── pnpm-lock.yaml
└── tsconfig.json
```

## 2. 技术选型 (第三方库)

为了保证稳定性和安全性，我们将依赖以下成熟的第三方库：

*   **密码学操作 (Cryptography)**:
    *   **库**: `libsodium-wrappers`
    *   **原因**: Libsodium 是一个现代、易于使用且经过严格审计的加密库。`libsodium-wrappers` 将其编译为 WebAssembly 和 JavaScript，提供了跨平台（浏览器和 Node.js）的高性能加密能力，并原生支持 Argon2id (`KDF`) 和认证加密 (`crypto_secretbox_easy`)，完全符合我们的设计需求。

*   **UUID 生成**:
    *   **库**: `uuid`
    *   **原因**: 业界标准库，用于生成符合 RFC4122 规范的 UUID，确保记录的全局唯一性。

*   **WebDAV 客户端**:
    *   **库**: `webdav`
    *   **原因**: 一个功能齐全的 WebDAV 客户端，支持在 JavaScript 环境中进行文件操作，适用于 Node.js 和浏览器环境。

## 3. 环境适配层设计

为了使内核能够无缝运行在浏览器和 Node.js 环境中，我们需要一个适配层来抽象环境相关的操作，主要是**数据持久化存储**。

### 3.1. 存储适配器接口 (`IStorageAdapter`)

我们将定义一个统一的存储接口，所有具体的存储实现都必须遵循这个接口。

```typescript
// core/adapters/types.ts
export interface IStorageAdapter {
  /**
   * 读取并返回指定路径的内容。
   * @param path 存储路径或键名。
   * @returns 返回文件内容的字符串，如果不存在则返回 null。
   */
  read(path: string): Promise<string | null>;

  /**
   * 将内容写入指定路径。
   * @param path 存储路径或键名。
   * @param data 要写入的内容。
   */
  write(path: string, data: string): Promise<void>;

  /**
   * 检查指定路径是否存在。
   * @param path 存储路径或键名。
   * @returns 如果存在则返回 true，否则返回 false。
   */
  exists(path: string): Promise<boolean>;

  /**
   * 删除指定路径的内容。
   * @param path 存储路径或键名。
   */
  remove(path: string): Promise<void>;
}
```

### 3.2. 具体实现

*   **浏览器环境**: 创建一个 `LocalStorageAdapter`，使用 `window.localStorage` 来实现 `IStorageAdapter` 接口。
*   **Node.js 环境**: 创建一个 `FileSystemAdapter`，使用 Node.js 的 `fs/promises` 模块来实现 `IStorageAdapter` 接口。

内核在初始化时，会根据当前运行环境，动态选择并注入相应的适配器实例。这样，内核的上层逻辑（如 `VaultManager`）就可以调用统一的接口（如 `storage.write()`)，而无需关心底层的具体实现。

## 4. 开发流程与质量保证

我们将遵循模块驱动的开发流程，并为每个模块设立明确的“完成定义”（Definition of Done）。

**每个模块的开发周期包括：**
1.  **编码实现**: 根据接口定义和设计文档编写模块代码。
2.  **单元测试**: 为模块的核心功能编写单元测试。
3.  **编译验证**: 确保该模块及其依赖可以无误地编译成 JavaScript。
4.  **功能评审**: 对照 `加密工具内核设计.md`，评审已实现的功能是否完全满足设计预期。

只有完成以上所有步骤，一个模块才被认为是“已完成”。

## 5. 下一步开发计划

在您批准此方案后，我将更新 TODO 列表，并从以下任务开始执行：
1.  调研并选择一个合适的 TypeScript 项目模板。
2.  使用 `pnpm` 基于模板初始化项目。
3.  根据我们的需求调整配置文件（`tsconfig.json`, `package.json` 等）。
4.  安装 `libsodium-wrappers`, `uuid`, `webdav` 等核心依赖。
5.  清理模板中的示例代码，并创建我们在方案中规划的目录结构。
6.  定义核心的 TypeScript 类型和适配器接口。