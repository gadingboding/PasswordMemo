/**
 * KDF (Key Derivation Function) Configuration Types
 *
 * These types define the data structures used for KDF configuration in the password manager.
 */

import {Base64String, BinaryData} from './crypto.js';

/**
 * Supported KDF algorithms
 */
export type KDFAlgorithm = 'argon2id';

/**
 * Supported KDF algorithm constants
 */
export const KDF_ALGORITHMS = {
  ARGON2ID: 'argon2id' as const,
} as const;

/**
 * Derived key result from KDF operations
 */
export interface DerivedKey {
  /** The derived key bytes */
  key: BinaryData;
}

/**
 * Base interface for KDF parameters
 * This allows for future expansion to support other algorithms
 */
export interface KDFParamsBase {
  /** Salt for key derivation */
  salt: Base64String;
  /** Output key length in bytes */
  keyLength: number;
}


/**
 * Argon2id algorithm parameters
 */
export interface Argon2idParams extends KDFParamsBase {
  /** Memory limit in bytes */
  memlimit?: number;
  /** Number of operations */
  opslimit?: number;
}

/**
 * KDF configuration
 */
export interface KDFConfig {
  /** KDF algorithm */
  algorithm: KDFAlgorithm;
  /** Algorithm-specific parameters */
  params: KDFParamsBase;
}

/**
 * Default KDF configuration
 */
export const DEFAULT_KDF_CONFIG: KDFConfig = {
  algorithm: KDF_ALGORITHMS.ARGON2ID,
  params: {
    salt: '',
    memlimit: 67108864,
    opslimit: 3,
    keyLength: 32
  } as Argon2idParams
} as const;

/**
 * KDF configuration validation result
 */
export interface KDFValidationResult {
  /** Whether the configuration is valid */
  valid: boolean;
  /** Error messages if invalid */
  errors?: string[];
}

/**
 * KDF configuration update result
 */
export interface KDFUpdateResult {
  /** Whether the update was successful */
  success: boolean;
  /** Error message if failed */
  error?: string;
}

/**
 * Default KDF parameters
 */
export const DEFAULT_KDF_PARAMS = {
  argon2id: {
    memlimit: 67108864, // 64 MiB
    opslimit: 3,
    keyLength: 32       // 256 bits
  }
} as const;

/**
 * KDF parameter validation rules
 */
export const KDF_VALIDATION_RULES = {
  argon2id: {
    opslimit: {min: 1, max: 10},              // 1 to 10 operations
    memlimit: {min: 8388608, max: 536870912}, // 8 MiB to 512 MiB
    keyLength: {min: 16, max: 64}             // 128 to 512 bits
  }
} as const;