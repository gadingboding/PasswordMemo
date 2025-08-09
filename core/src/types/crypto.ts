/**
 * Cryptography Types
 *
 * Types related to encryption, key management, and security operations.
 */

/**
 * Supported padding bucket sizes in bytes
 */
export const PADDING_BUCKETS = [64, 128, 256, 512, 1024, 2048, 4096] as const;

/**
 * Type for padding bucket sizes
 */
export type PaddingBucketSize = typeof PADDING_BUCKETS[number];

/**
 * Raw binary data representation
 */
export type BinaryData = Uint8Array;

/**
 * Base64 encoded string
 */
export type Base64String = string;

export type MasterPassword = string;

export const AES_GCM = "AES-GCM";


/**
 * Encrypted data container with metadata
 */
export interface EncryptedData {
  /** Base64 encoded ciphertext */
  ciphertext: Base64String;
  /** Base64 encoded nonce/IV */
  nonce: Base64String;
  /** Algorithm used for encryption */
  algorithm: 'xchacha20-poly1305' | 'AES-GCM';
}


/**
 * Padding operation result
 */
export interface PaddedData {
  /** Original data with padding applied */
  data: BinaryData;
  /** Size of the bucket used */
  bucketSize: PaddingBucketSize;
}