# libsodium 最小化重构计划

## 问题

- 声称使用 libsodium，实际加密完全依赖 Web Crypto API/Node.js crypto
- 浏览器和 Node.js 环境使用不同的加密实现，架构分裂
- 需要维护两套加密代码

## 目标

将所有加密相关功能从 Web Crypto API/Node.js crypto 迁移到 libsodium，实现完全统一的跨平台加密实现

## 重构内容

1. **加密/解密**: 从 AES-GCM 迁移到 ChaCha20-Poly1305-IETF
2. **随机数生成**: 统一到 `sodium.randombytes_buf()`
3. **Base64 编解码**: 统一到 `sodium.to_base64()` / `sodium.from_base64()`
4. **密钥派生**: 暂时保持 PBKDF2 (libsodium 无直接支持，为保持兼容性不迁移)
5. **移除所有条件分支代码**，实现单一接口
6. **保持相同的接口和行为**，确保向后兼容性

## 预期收益

- 统一的加密实现，消除主要架构分裂
- 简化代码维护，移除加密相关的条件分支
- 统一的安全标准和算法实现
- 更好的跨平台兼容性
- 保持向后兼容性

## 风险

- 需要确保现有加密数据可以正常解密
- 需要验证 libsodium 性能表现
- 需要测试所有加密相关功能的兼容性