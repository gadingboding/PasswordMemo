/**
 * Storage Constants
 * 
 * Defines constant values for storage keys to avoid string literals throughout the codebase
 */

/**
 * Storage keys used throughout the application
 */
export const STORAGE_KEYS = {
  /** User profile data storage key */
  USER_PROFILE: 'user-profile',
  /** Vault data storage key */
  VAULT_DATA: 'vault-data',
} as const;

/**
 * Default namespace for storage
 */
export const DEFAULT_STORAGE_NAMESPACE = 'PasswordMemo';

/**
 * Default KDF configuration
 */
export const DEFAULT_KDF_ITERATIONS = 100000;
export const DEFAULT_KDF_MEMORY_LIMIT = 67108864; // 64MB
export const DEFAULT_KDF_PARALLELISM = 4;