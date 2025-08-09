/**
 * KDF (Key Derivation Function) Configuration Types
 *
 * These types define the data structures used for KDF configuration in the password manager.
 */

import {Base64String, BinaryData} from './crypto.js';

/**
 * Supported KDF algorithms
 */
export type KDFAlgorithm = 'pbkdf2'; // Currently only PBKDF2 is supported, but architecture allows for future expansion

/**
 * Supported KDF algorithm constants
 */
export const KDF_ALGORITHMS = {
  PBKDF2: 'pbkdf2' as const,
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
 * PBKDF2 algorithm parameters
 */
export interface PBKDF2Params extends KDFParamsBase {
  /** Number of iterations */
  iterations: number;
  /** Hash algorithm (e.g., 'sha256') */
  hash: string;
}

/**
 * KDF configuration
 */
export interface KDFConfig {
  /** KDF algorithm */
  algorithm: KDFAlgorithm;
  /** Algorithm-specific parameters */
  params: KDFParamsBase; // Base type that supports all algorithms, currently only PBKDF2Params is used
}

/**
 * Default KDF configuration
 */
export const DEFAULT_KDF_CONFIG: KDFConfig = {
  algorithm: KDF_ALGORITHMS.PBKDF2,
  params: {
    salt: '',
    iterations: 600000,
    hash: 'sha256',
    keyLength: 32
  } as PBKDF2Params
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
  pbkdf2: {
    iterations: 600000,
    hash: 'sha256',
    keyLength: 32       // 256 bits
  }
} as const;

/**
 * KDF parameter validation rules
 */
export const KDF_VALIDATION_RULES = {
  pbkdf2: {
    iterations: {min: 10000, max: 10000000}, // 10K to 10M
    hash: {allowed: ['sha256', 'sha512']},
    keyLength: {min: 16, max: 64}            // 128 to 512 bits
  }
} as const;