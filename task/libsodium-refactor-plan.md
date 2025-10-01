# libsodium 最小化重构计划

## 问题

- 声称使用 libsodium，实际加密完全依赖 Web Crypto API/Node.js crypto
- 浏览器和 Node.js 环境使用不同的加密实现，架构分裂
- 需要维护两套加密代码

## 目标

将 `CryptographyEngine.encrypt` 和 `decrypt` 方法从 Web Crypto API/Node.js crypto 迁移到 libsodium 的 `crypto_aead_chacha20poly1305_ietf` (ChaCha20-Poly1305)

## 重构内容

1. 替换 `encrypt/decrypt` 方法实现
2. 从 AES-GCM 迁移到 ChaCha20-Poly1305-IETF，保持 12 字节 nonce 长度
3. 移除加密/解密中的条件分支代码
4. 保持相同的接口和行为

## 预期收益

- 统一加密实现，消除架构分裂
- 简化代码维护
- 保持向后兼容性

## 风险

- 需要确保现有加密数据可以正常解密
- 需要验证 libsodium 性能表现