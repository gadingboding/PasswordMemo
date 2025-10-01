/**
 * Cryptography Engine
 *
 * Core cryptographic operations including key derivation, encryption/decryption,
 * and padding for the password manager.
 */

import _sodium from 'libsodium-wrappers';
import {
  BinaryData,
  Base64String,
  EncryptedData,
  PaddedData,
  PaddingBucketSize,
  PADDING_BUCKETS,
  MasterPassword, AES_GCM, CHACHA20_POLY1305_IETF
} from './types/index.js';

/**
 * Initialize libsodium
 */
let sodiumReady = false;

async function ensureSodiumReady(): Promise<void> {
  if (!sodiumReady) {
    await _sodium.ready;
    sodiumReady = true;
  }
}

/**
 * Cryptography Engine implementation
 */
export class CryptographyEngine {
  /**
   * Generate cryptographically secure random bytes
   */
  static async randomBytes(length: number): Promise<BinaryData> {
    await ensureSodiumReady();
    return _sodium.randombytes_buf(length);
  }

  /**
   * Convert Base64 string to Uint8Array using libsodium
   */
  static async base64ToBytes(base64: Base64String): Promise<Uint8Array> {
    await ensureSodiumReady();
    return _sodium.from_base64(base64, _sodium.base64_variants.ORIGINAL);
  }

  /**
   * Convert Uint8Array to Base64 string using libsodium
   */
  static async bytesToBase64(bytes: Uint8Array): Promise<Base64String> {
    await ensureSodiumReady();
    return _sodium.to_base64(bytes, _sodium.base64_variants.ORIGINAL);
  }

  /**
   * Convert Uint8Array to hex string
   */
  static bytesToHex(bytes: Uint8Array): string {
    let hexString = '';
    for (let i = 0; i < bytes.length; i++) {
      const byte = bytes[i];
      if (byte !== undefined) {
        const hex = byte.toString(16).padStart(2, '0');
        hexString += hex;
      }
    }
    return hexString;
  }

  /**
   * Generate a random salt for key derivation
   * Uses 128-bit (16 bytes) cryptographically secure random numbers from libsodium
   */
  static async generateSalt(): Promise<Base64String> {
    await ensureSodiumReady();
    const salt = await this.randomBytes(16); // 16 bytes = 128 bits salt
    return this.bytesToBase64(salt);
  }

  /**
   * Apply length normalization padding
   */
  static async pad(data: BinaryData): Promise<PaddedData> {
    await ensureSodiumReady();

    const originalLength = data.length;
    const requiredLength = originalLength + 1; // +1 for delimiter

    // Find the appropriate bucket size
    let bucketSize: PaddingBucketSize | undefined;
    for (const size of PADDING_BUCKETS) {
      if (size >= requiredLength) {
        bucketSize = size;
        break;
      }
    }

    if (!bucketSize) {
      throw new Error(`Data too large for padding. Maximum size is ${PADDING_BUCKETS[PADDING_BUCKETS.length - 1]} bytes`);
    }

    // Create padded data
    const paddedData = new Uint8Array(bucketSize);

    // Copy original data
    paddedData.set(data, 0);

    // Add delimiter (0x80)
    paddedData[originalLength] = 0x80;

    // Generate clean padding data without 0x80 bytes
    const paddingLength = bucketSize - requiredLength;
    const cleanPadding = await this.generateCleanPadding(paddingLength);
    paddedData.set(cleanPadding, requiredLength);

    return {
      data: paddedData,
      bucketSize,
    };
  }

  /**
   * Remove length normalization padding
   */
  static unpad(paddedData: BinaryData): BinaryData {
    // Find the delimiter (0x80) from the end - no escape sequences to handle
    let delimiterIndex = -1;
    for (let i = paddedData.length - 1; i >= 0; i--) {
      if (paddedData[i] === 0x80) {
        delimiterIndex = i;
        break;
      }
    }

    if (delimiterIndex === -1) {
      throw new Error('Invalid padded data: delimiter not found');
    }

    // Return original data (everything before the delimiter)
    return paddedData.slice(0, delimiterIndex);
  }

  /**
   * Encrypt data using ChaCha20-Poly1305-IETF with padding
   */
  static async encrypt(data: string | BinaryData, key: BinaryData): Promise<EncryptedData> {
    await ensureSodiumReady();

    // Convert string to bytes if necessary
    const dataBytes = typeof data === 'string'
      ? new TextEncoder().encode(data)
      : data;

    // Apply padding
    const paddedResult = await this.pad(new Uint8Array(dataBytes));

    // Generate nonce (12 bytes for ChaCha20-Poly1305-IETF)
    const nonce = _sodium.randombytes_buf(_sodium.crypto_aead_chacha20poly1305_ietf_NPUBBYTES);

    // Use libsodium for encryption
    const encrypted = _sodium.crypto_aead_chacha20poly1305_ietf_encrypt(
      paddedResult.data,  // plaintext
      null,              // additional data (none)
      null,              // nsec (unused for this construction)
      nonce,             // nonce
      key.slice(0, _sodium.crypto_aead_chacha20poly1305_ietf_KEYBYTES)  // key (32 bytes)
    );

    return {
      ciphertext: await this.bytesToBase64(new Uint8Array(encrypted)),
      nonce: await this.bytesToBase64(new Uint8Array(nonce)),
      algorithm: CHACHA20_POLY1305_IETF,
    };
  }

  /**
   * Decrypt data using ChaCha20-Poly1305-IETF and remove padding
   */
  static async decrypt(encryptedData: EncryptedData, key: BinaryData): Promise<BinaryData> {
    await ensureSodiumReady();

    if (encryptedData.algorithm !== CHACHA20_POLY1305_IETF) {
      throw new Error(`Unsupported algorithm: ${encryptedData.algorithm}`);
    }

    const ciphertext = await this.base64ToBytes(encryptedData.ciphertext);
    const nonce = await this.base64ToBytes(encryptedData.nonce);

    try {
      // Use libsodium for decryption
      const decrypted = _sodium.crypto_aead_chacha20poly1305_ietf_decrypt(
        null,                                   // nsec (unused)
        ciphertext,                             // ciphertext + auth tag
        null,                                   // additional data (none)
        nonce,                                  // nonce
        key.slice(0, _sodium.crypto_aead_chacha20poly1305_ietf_KEYBYTES)  // key (32 bytes)
      );

      // Remove padding
      return this.unpad(new Uint8Array(decrypted));
    } catch (error) {
      throw new Error(`Decryption failed: ${error}`);
    }
  }

  /**
   * Decrypt data and return as string
   */
  static async decryptToString(encryptedData: EncryptedData, key: BinaryData): Promise<string> {
    const decryptedBytes = await this.decrypt(encryptedData, key);
    return new TextDecoder().decode(decryptedBytes);
  }

  /**
   * Generate clean padding data without 0x80 bytes to avoid delimiter conflicts
   */
  static async generateCleanPadding(targetLength: number): Promise<Uint8Array> {
    let multiplier = 2;
    let attempts = 0;
    const maxAttempts = 3; // Try 2x, 4x, then use byte-by-byte fallback

    while (attempts < maxAttempts) {
      const generateLength = targetLength * multiplier;
      const rawPadding = await this.randomBytes(generateLength);
      const cleanPadding = rawPadding.filter(byte => byte !== 0x80);

      if (cleanPadding.length >= targetLength) {
        return cleanPadding.slice(0, targetLength);
      }

      multiplier *= 2; // Try 4x next
      attempts++;
    }

    // Fallback: generate byte-by-byte if bulk generation fails
    const result = new Uint8Array(targetLength);
    let i = 0;
    while (i < targetLength) {
      const byte = (await this.randomBytes(1))[0];
      if (byte !== 0x80) {
        result[i] = byte!;
        i++;
      }
    }
    return result;
  }
}