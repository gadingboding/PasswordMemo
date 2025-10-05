/**
 * Synchronization Types
 *
 * Types related to data synchronization, conflict resolution, and remote storage.
 */

import {Vault} from './vault.js';
import {KDFConfig} from './kdf.js';

/**
 * Push operation result (local to remote)
 */
export interface PushResult {
  /** Whether the push operation was successful */
  success: boolean;
  /** Error message if push failed */
  error?: string;
  /** Number of records pushed */
  recordsPushed: number;
  /** Number of conflicts resolved */
  conflictsResolved: number;
  /** Timestamp of the push operation */
  timestamp: string;
  /** Whether password is required for KDF configuration alignment */
  passwordRequired?: boolean;
}

/**
 * Pull operation result (remote to local)
 */
export interface PullResult {
  /** Whether the pull operation was successful */
  success: boolean;
  /** Error message if pull failed */
  error?: string;
  /** Number of records pulled */
  recordsPulled: number;
  /** Number of conflicts resolved */
  conflictsResolved: number;
  /** Timestamp of the pull operation */
  timestamp: string;
  /** Whether local vault was updated */
  vaultUpdated: boolean;
  /** Merged vault data if vault was updated */
  mergedVault?: Vault;
  /** Whether KDF configuration was updated */
  kdfUpdated?: boolean;
  /** Remote KDF configuration if it was updated */
  remoteKdfConfig?: KDFConfig;
  /** Whether password is required for KDF configuration alignment */
  passwordRequired?: boolean;
}


/**
 * Sync status
 */
export interface SyncStatus {
  /** Whether sync is currently in progress */
  syncing: boolean;
  /** Last successful sync timestamp */
  lastSync?: string;
  /** Last sync error if any */
  lastError?: string;
  /** Number of pending changes */
  pendingChanges: number;
}
