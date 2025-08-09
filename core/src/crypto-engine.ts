/**
 * Cryptography Engine
 *
 * Core cryptographic operations including key derivation, encryption/decryption,
 * and padding for the password manager.
 */

import * as sodium from 'libsodium-wrappers';
import {
  BinaryData,
  Base64String,
  EncryptedData,
  PaddedData,
  PaddingBucketSize,
  PADDING_BUCKETS,
  MasterPassword, AES_GCM
} from './types/index.js';

/**
 * Initialize libsodium
 */
let sodiumReady = false;

async function ensureSodiumReady(): Promise<void> {
  if (!sodiumReady) {
    await sodium.ready;
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
  static randomBytes(length: number): BinaryData {
    if (!sodiumReady) {
      throw new Error('Sodium not initialized. Call ensureSodiumReady() first.');
    }

    // Use Web Crypto API in browser or Node.js crypto module
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
      // Browser environment
      const array = new Uint8Array(length);
      crypto.getRandomValues(array);
      return array;
    } else {
      // Node.js environment - use require for crypto
      try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const crypto = require('crypto');
        return new Uint8Array(crypto.randomBytes(length));
      } catch (error) {
        throw new Error('No secure random number generator available');
      }
    }
  }

  /**
   * Convert Base64 string to Uint8Array
   */
  static base64ToBytes(base64: Base64String): Uint8Array {
    if (typeof atob !== 'undefined') {
      // Browser environment
      const binaryString = atob(base64);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      return bytes;
    } else {
      // Node.js environment
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      return new Uint8Array(Buffer.from(base64, 'base64'));
    }
  }

  /**
   * Convert Uint8Array to Base64 string
   */
  static bytesToBase64(bytes: Uint8Array): Base64String {
    if (typeof btoa !== 'undefined') {
      // Browser environment
      let binaryString = '';
      for (let i = 0; i < bytes.length; i++) {
        const byte = bytes[i];
        if (byte !== undefined) {
          binaryString += String.fromCharCode(byte);
        }
      }
      return btoa(binaryString);
    } else {
      // Node.js environment
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      return Buffer.from(bytes).toString('base64');
    }
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
    const salt = this.randomBytes(16); // 16 bytes = 128 bits salt for PBKDF2
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
    const cleanPadding = this.generateCleanPadding(paddingLength);
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
   * Encrypt data using AES-GCM with padding
   */
  static async encrypt(data: string | BinaryData, key: BinaryData): Promise<EncryptedData> {
    await ensureSodiumReady();

    // Convert string to bytes if necessary
    const dataBytes = typeof data === 'string'
      ? new TextEncoder().encode(data)
      : data;

    // Apply padding
    const paddedResult = await this.pad(new Uint8Array(dataBytes));

    // Generate nonce (12 bytes for AES-GCM)
    const nonce = this.randomBytes(12);


    // Use Web Crypto API for encryption
    if (typeof crypto !== 'undefined' && crypto.subtle) {
      // Browser environment
      const cryptoKey = await crypto.subtle.importKey(
        'raw',
        new Uint8Array(key),
        {name: 'AES-GCM'},
        false,
        ['encrypt']
      );

      const encrypted = await crypto.subtle.encrypt(
        {
          name: AES_GCM,
          iv: new Uint8Array(nonce),
          tagLength: 128, // Explicitly set tag length to 128 bits (16 bytes)
        },
        cryptoKey,
        new Uint8Array(paddedResult.data)
      );

      return {
        ciphertext: this.bytesToBase64(new Uint8Array(encrypted)),
        nonce: this.bytesToBase64(nonce),
        algorithm: AES_GCM,
      };
    } else {
      // Node.js environment
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const crypto = require('crypto');

      const cipher = crypto.createCipheriv(
        'aes-256-gcm',
        Buffer.from(key),
        Buffer.from(nonce)
      );

      const ciphertext = Buffer.concat([
        cipher.update(Buffer.from(paddedResult.data)),
        cipher.final()
      ]);

      const authTag = cipher.getAuthTag();

      // Combine ciphertext and auth tag
      const combined = Buffer.concat([ciphertext, authTag]);

      return {
        ciphertext: this.bytesToBase64(new Uint8Array(combined)),
        nonce: this.bytesToBase64(nonce),
        algorithm: AES_GCM,
      };
    }
  }

  /**
   * Decrypt data using AES-GCM and remove padding
   */
  static async decrypt(encryptedData: EncryptedData, key: BinaryData): Promise<BinaryData> {
    await ensureSodiumReady();

    if (encryptedData.algorithm !== AES_GCM) {
      throw new Error(`Unsupported algorithm: ${encryptedData.algorithm}`);
    }

    const ciphertext = this.base64ToBytes(encryptedData.ciphertext);
    const nonce = this.base64ToBytes(encryptedData.nonce);


    // Use Web Crypto API for decryption
    if (typeof crypto !== 'undefined' && crypto.subtle) {
      // Browser environment
      const cryptoKey = await crypto.subtle.importKey(
        'raw',
        new Uint8Array(key),
        {name: 'AES-GCM'},
        false,
        ['decrypt']
      );

      try {
        // Web Crypto API expects the authentication tag to be included in the ciphertext
        // The ciphertext should already contain the auth tag (as produced by our encrypt method)
        const decrypted = await crypto.subtle.decrypt(
          {
            name: 'AES-GCM',
            iv: new Uint8Array(nonce),
            tagLength: 128, // Explicitly set tag length to 128 bits (16 bytes)
          },
          cryptoKey,
          new Uint8Array(ciphertext)
        );

        // Remove padding
        return this.unpad(new Uint8Array(decrypted));
      } catch (error) {
        throw new Error(`Decryption failed: ${error}`);
      }
    } else {
      // Node.js environment
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const crypto = require('crypto');

      // In Node.js, the last 16 bytes are the auth tag
      const authTagLength = 16;
      const ciphertextWithoutTag = ciphertext.slice(0, ciphertext.length - authTagLength);
      const authTag = ciphertext.slice(ciphertext.length - authTagLength);

      const decipher = crypto.createDecipheriv(
        'aes-256-gcm',
        Buffer.from(key),
        Buffer.from(nonce)
      );

      decipher.setAuthTag(Buffer.from(authTag));

      const decrypted = Buffer.concat([
        decipher.update(Buffer.from(ciphertextWithoutTag)),
        decipher.final()
      ]);

      // Remove padding
      return this.unpad(new Uint8Array(decrypted));
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
  static generateCleanPadding(targetLength: number): Uint8Array {
    let multiplier = 2;
    let attempts = 0;
    const maxAttempts = 3; // Try 2x, 4x, then use byte-by-byte fallback

    while (attempts < maxAttempts) {
      const generateLength = targetLength * multiplier;
      const rawPadding = this.randomBytes(generateLength);
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
      const byte = this.randomBytes(1)[0];
      if (byte !== 0x80) {
        result[i] = byte!;
        i++;
      }
    }
    return result;
  }
}