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
export const CHACHA20_POLY1305_IETF = "ChaCha20-Poly1305-IETF";

/**
 * AES-GCM encrypted data with nonce length validation (12 bytes)
 */
export interface AESGCMEncryptedData {
  /** Base64 encoded ciphertext */
  ciphertext: Base64String;
  /** Base64 encoded nonce (must be exactly 12 bytes when decoded) */
  nonce: Base64String;
  /** Algorithm identifier */
  algorithm: typeof AES_GCM;
}

/**
 * ChaCha20-Poly1305-IETF encrypted data with nonce length validation (12 bytes)
 */
export interface ChaCha20Poly1305IETFEncryptedData {
  /** Base64 encoded ciphertext */
  ciphertext: Base64String;
  /** Base64 encoded nonce (must be exactly 12 bytes when decoded) */
  nonce: Base64String;
  /** Algorithm identifier */
  algorithm: typeof CHACHA20_POLY1305_IETF;
}

/**
 * Union type for all encrypted data types
 */
export type EncryptedData = AESGCMEncryptedData | ChaCha20Poly1305IETFEncryptedData;


/**
 * Padding operation result
 */
export interface PaddedData {
  /** Original data with padding applied */
  data: BinaryData;
  /** Size of the bucket used */
  bucketSize: PaddingBucketSize;
}


/**
 * Sentinel password validation result
 */
export interface SentinelValidationResult {
  /** Whether validation was successful */
  success: boolean;
  /** Error message if validation failed */
  error?: string;
}

/**
 * Default sentinel password value
 * This is a simple string that will be encrypted with the master key
 */
export const DEFAULT_SENTINEL_VALUE = '123456789';

/**
 * Password strength levels
 */
export enum PasswordStrength {
  VERY_WEAK = 0,
  WEAK = 1,
  FAIR = 2,
  GOOD = 3,
  STRONG = 4
}

/**
 * Password complexity check result
 */
export interface PasswordComplexityResult {
  /** Password strength score (0-4) */
  score: PasswordStrength;
  /** Whether the password meets minimum requirements */
  isAcceptable: boolean;
  /** Warning messages about the password */
  warning: string[];
  /** Suggestions for improving the password */
  suggestions: string[];
}