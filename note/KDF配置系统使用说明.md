# KDF 配置系统使用说明

## 概述

KDF（Key Derivation Function）配置系统为密码管理器提供了灵活的密钥派生功能，支持多种算法和可配置参数。该系统解决了跨设备 master key 不一致的问题，确保在不同机器上使用相同的配置生成相同的 master key。

## 主要特性

- **多算法支持**：支持 PBKDF2 主流 KDF 算法（架构支持未来扩展）
- **灵活配置**：可调整内存成本、时间成本、迭代次数等参数
- **跨设备兼容**：KDF 配置存储在 vault 中，确保不同设备使用相同配置
- **安全验证**：严格的参数验证和安全检查
- **无缝切换**：支持在不解密数据的情况下切换 KDF 配置

## 架构设计

### 核心组件

1. **KDFAdapter** (`core/src/KDFAdapter.ts`)
   - 管理 KDF 配置和参数验证
   - 提供密钥派生功能
   - 支持多种算法

2. **KDFConfigApi** (`core/src/KDFConfigApi.ts`)
   - 提供高级 API 接口
   - 管理 KDF 配置更新
   - 提供配置建议和验证

3. **扩展的 CryptographyEngine**
   - 支持使用 KDF 配置进行密钥派生
   - 保持向后兼容性

4. **Vault 集成**
   - KDF 配置存储在 vault 中
   - 认证时自动使用 vault 中的配置

### 数据流

```
用户密码 + KDF配置 → KDFAdapter → Master Key → 数据加密/解密
```

## 使用指南

### 基本使用

#### 1. 创建密码管理器实例

```typescript
import { PasswordManager } from 'password-manager-password-memo-core';

const passwordManager = new PasswordManager();
await passwordManager.initialize({
  storage: {
    basePath: './vault-data',
    namespace: 'my-vault'
  }
});
```

#### 2. 首次认证（自动创建 KDF 配置）

```typescript
const authResult = await passwordManager.authenticate({
  password: 'your-master-password'
});

if (authResult.success) {
  console.log('Vault unlocked successfully');
}
```

#### 3. 正常使用密码管理器功能

```typescript
// 创建模板
const templateId = await passwordManager.createTemplate('Website Login', [
  { name: 'Username', type: 'text', optional: false },
  { name: 'Password', type: 'password', optional: false }
]);

// 添加记录
const recordId = await passwordManager.createRecord(
  templateId,
  'GitHub Account',
  {
    username: 'myuser@example.com',
    password: 'secure-password-123'
  }
);

// 获取记录
const record = await passwordManager.getRecord(recordId);
```

### 高级使用（KDF 配置管理）

#### 获取当前 KDF 配置

```typescript
// 通过 DataManager 获取（需要内部访问）
const vaultManager = new DataManager();
await vaultManager.loadVaultFromStorage();
const kdfConfig = vaultManager.getKDFConfig();
console.log('Current KDF algorithm:', kdfConfig?.algorithm);
```

#### 验证 KDF 配置

```typescript
import { KDFAdapter } from '@password-manager/password-memo-core';

const kdfManager = new KDFAdapter();
const validation = kdfManager.validateConfig(kdfConfig);

if (validation.valid) {
  console.log('KDF configuration is valid');
} else {
  console.error('Validation errors:', validation.errors);
}
```

#### 创建新的 KDF 配置

```typescript
// 创建 PBKDF2 配置
const pbkdf2Config = await kdfManager.createDefaultConfig('pbkdf2');
```

#### 获取支持的算法

```typescript
const algorithms = kdfManager.getSupportedAlgorithms();
// 返回: ['pbkdf2']
```

#### 获取默认参数

```typescript
const defaultParams = kdfManager.getDefaultParams('pbkdf2');
console.log('Default PBKDF2 parameters:', defaultParams);
```

### KDF 配置更新（高级功能）

⚠️ **注意**: KDF 配置更新需要重新加密所有数据，这是一个耗时的操作。

```typescript
// 更新 KDF 配置（需要用户重新输入密码）
const updateResult = await kdfConfigAPI.updateKDFConfig(
  newKDFConfig,
  currentPassword
);

if (updateResult.success) {
  console.log('KDF configuration updated successfully');
} else {
  console.error('Update failed:', updateResult.error);
}
```

## KDF 算法对比

### PBKDF2
- **优点**: 广泛支持，标准化
- **参数**: iterations, hash
- **推荐配置**: iterations: 600000, hash: 'sha256'

## 安全配置建议

### 安全级别推荐

| 安全级别 | PBKDF2 参数 | 估计时间 |
|----------|-------------|----------|
| 低 | iterations: 100000 | < 0.5s |
| 中 | iterations: 600000 | 0.5-1s |
| 高 | iterations: 1000000 | 1-2s |
| 极高 | iterations: 2000000+ | 2-5s |

### 参数验证规则

系统会自动验证 KDF 参数是否在安全范围内：

- **PBKDF2**: iterations 10K-10M, keyLength 16-64 bytes

## 故障排除

### 常见问题

#### 1. 认证失败
```typescript
// 检查 KDF 配置是否存在
const kdfConfig = vaultManager.getKDFConfig();
if (!kdfConfig) {
  throw new Error('KDF configuration not found');
}
```

#### 2. KDF 配置验证失败
```typescript
const validation = kdfManager.validateConfig(config);
if (!validation.valid) {
  console.error('Validation errors:', validation.errors);
  // 根据错误信息调整参数
}
```

#### 3. 配置更新失败
```typescript
// 确保 vault 已解锁
if (!vaultManager.isUnlocked()) {
  throw new Error('Vault must be unlocked');
}

// 验证密码
try {
  await kdfManager.deriveKey(password, currentConfig);
} catch (error) {
  throw new Error('Invalid password');
}
```

## 测试验证

系统包含完整的测试套件来验证 KDF 配置功能：

```bash
# 运行 KDF 配置测试
npm run test:kdf-config

# 开发模式运行
npm run test:kdf-config:dev
```

测试覆盖：
- ✅ KDF 配置创建和验证
- ✅ 认证功能
- ✅ 数据完整性
- ✅ Vault 锁定/解锁
- ✅ 重新认证

## 性能考虑

### 算法选择
- **PBKDF2**: 平衡了安全性和性能，适合大多数场景

### 参数调优
- 根据设备性能调整参数
- 平衡安全性和用户体验
- 考虑移动设备的资源限制

## 迁移指南

### 从旧版本迁移

1. **自动迁移**: 新系统会自动为现有 vault 添加默认 KDF 配置
2. **手动更新**: 如需更新配置，使用 `updateKDFConfig` API
3. **兼容性**: 保持向后兼容，不影响现有功能

## 总结

KDF 配置系统为密码管理器提供了：
- 🔒 **更强的安全性**: 支持现代 KDF 算法
- 🔄 **跨设备一致性**: 解决 master key 不一致问题
- ⚙️ **灵活的配置**: 可调整安全参数
- 🛡️ **向后兼容**: 不影响现有功能
- ✅ **完整测试**: 确保系统可靠性

该系统已经过全面测试，可以安全地用于生产环境。