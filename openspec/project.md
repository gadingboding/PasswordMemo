# Project Context

## Purpose
PasswordMemo 是一个安全的密码管理器，专注于提供端到端加密的密码存储和同步功能。项目旨在为用户提供一个安全、易用的密码管理解决方案，支持跨设备同步和多种存储后端。

## Tech Stack
- **核心语言**: TypeScript
- **前端框架**: React 19 + React Router
- **构建工具**: Vite
- **样式框架**: Tailwind CSS
- **状态管理**: Zustand
- **加密库**: libsodium-wrappers-sumo
- **同步协议**: WebDAV
- **包管理器**: pnpm (monorepo)
- **测试框架**: Jest
- **代码质量**: ESLint + Prettier

## Project Conventions

### Code Style
- 使用 ES6+ 模块语法，避免 CommonJS
- 严格的 TypeScript 配置，启用所有类型检查
- 使用 Prettier 进行代码格式化
- 禁止在任何地方使用 emoji
- 文件名使用 kebab-case
- 组件名使用 PascalCase
- 常量使用 UPPER_SNAKE_CASE

### Architecture Patterns
- **分层架构**: 内核层 (password-memo-core) + 表示层 (password-memo-browser)
- **模块化设计**: 认证管理、加密引擎、保险库管理、同步协调器、配置管理器
- **字段级加密**: 每个敏感字段独立加密，使用长度规范化填充方案
- **同步策略**: 基于 UUID 和时间戳的 Last Write Wins 冲突解决机制

### Testing Strategy
此项目不编写任何单元测试用例

### Git Workflow
- 使用功能分支开发 (feature/xxx)
- 提交信息使用约定式提交格式
- 代码审查必须通过后才能合并
- 使用语义化版本控制

## Domain Context

### 密码管理领域知识
- **主密钥派生**: 支持 Argon2id 和 PBKDF2 算法
- **PIN 解锁机制**: 访问密钥 (AK) 和 PIN 解锁密钥 (PUK) 的双层安全设计
- **同步冲突解决**: 基于记录版本控制的 Last Write Wins 策略
- **删除处理**: 使用墓碑标记 (tombstone) 处理跨设备删除同步
- **模板系统**: 支持用户自定义字段模板，模板定义整体加密

### 安全设计原则
- 零知识架构：服务端无法解密用户数据
- 前向安全性：密钥泄露不影响历史数据
- 长度隐藏：使用随机化填充隐藏数据真实长度
- 内存安全：敏感数据及时清理，最小化内存驻留时间

## Important Constraints

### 安全约束
- 所有敏感数据必须使用 AES-GCM 认证加密
- 主密码永不存储，仅用于密钥派生
- PIN 解锁有失败次数限制和过期时间
- 禁止在日志中记录任何敏感信息

### 性能约束
- 加密操作必须在 100ms 内完成
- 同步操作支持增量更新，避免全量传输
- 内存使用控制在合理范围内，避免长时间持有大量解密数据

### 兼容性约束
- 支持现代浏览器 (Chrome 90+, Firefox 88+, Safari 14+)
- 必须支持 WebAssembly 执行环境
- WebDAV 服务器必须支持 RFC 4918 标准

## External Dependencies

### 核心依赖
- **libsodium-wrappers-sumo**: 提供现代密码学原语
- **webdav**: WebDAV 协议客户端实现
- **zxcvbn**: 密码强度检查库

### 开发依赖
- **Vite**: 快速构建工具和开发服务器
- **Tailwind CSS**: 实用优先的 CSS 框架
- **Lucide React**: 现代图标库

### 外部服务
- **WebDAV 服务器**: 用于数据同步的远程存储
- **浏览器扩展 API**: Chrome Extension Manifest V3
