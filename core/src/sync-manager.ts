/**
 * Sync Manager
 *
 * Handles data synchronization with remote storage using remote storage implementations.
 * Implements the history-based synchronization strategy as described in the design.
 */

import {v4 as uuidv4} from 'uuid';
import {Vault, WebDAVConfig} from './types/vault.js';
import {PullResult, PushResult, SyncConfig, SyncStatus} from './types/sync.js';
import {CryptographyEngine} from './crypto-engine.js';
import {ConfigurationManager} from './configuration-manager.js';
import {VaultManager} from './vault-manager.js';
import {IRemoteStorage, WebDAVRemoteStorage} from './remoteStorage.js';

/**
 * Sync Manager for handling synchronization
 */
export class SyncManager {
  private storageAdapter: IRemoteStorage | null = null;
  private vaultManager: VaultManager;
  private syncStatus: SyncStatus = {
    syncing: false,
    pendingChanges: 0
  };
  private syncConfig: SyncConfig = {
    maxRetries: 3,
    retryDelay: 5000 // 5 seconds
  };
  private webdavConfig: WebDAVConfig | null = null;

  constructor(
    configManager: ConfigurationManager,
    cryptoEngine: CryptographyEngine,
    vaultManager: VaultManager
  ) {
    this.vaultManager = vaultManager;
  }

  /**
   * Initialize storage adapter with configuration
   */
  async initializeStorage(config: WebDAVConfig): Promise<void> {
    try {
      this.webdavConfig = config;
      this.storageAdapter = new WebDAVRemoteStorage(config);

      // Test connection by checking if the root directory exists
      await this.storageAdapter.exists('/');
    } catch (error) {
      throw new Error(`Storage connection failed: ${error}`);
    }
  }

  /**
   * Configure synchronization settings
   */
  configureSync(config: Partial<SyncConfig>): void {
    this.syncConfig = {...this.syncConfig, ...config};
  }

  /**
   * Get current synchronization status
   */
  getSyncStatus(): SyncStatus {
    return {...this.syncStatus};
  }

  /**
   * Generate a new sync version ID (similar to git commit ID)
   */
  private generateSyncVersionId(): string {
    // Generate a UUID and take first 8 characters for compactness
    return uuidv4().substring(0, 8);
  }

  /**
   * Check if first history array is a prefix of second history array
   */
  private isHistoryPrefix(prefixHistory: string[], fullHistory: string[]): boolean {
    if (prefixHistory.length > fullHistory.length) {
      return false;
    }

    for (let i = 0; i < prefixHistory.length; i++) {
      if (prefixHistory[i] !== fullHistory[i]) {
        return false;
      }
    }

    return true;
  }

  /**
   * Merge two vaults using last-write-wins strategy
   */
  private async mergeVaults(
    localVault: Vault,
    remoteVault: Vault
  ): Promise<{ mergedVault: Vault; conflictsResolved: number }> {
    const mergedVault: Vault = {
      records: {...localVault.records},
      labels: {...localVault.labels},
      templates: {...localVault.templates},
      history: localVault.history,
      kdf: localVault.kdf
    };

    let conflictsResolved = 0;

    // Merge records
    for (const [recordId, remoteRecord] of Object.entries(remoteVault.records)) {
      const localRecord = localVault.records[recordId];

      if (!localRecord) {
        // Record only exists remotely - add it
        mergedVault.records[recordId] = remoteRecord;
      } else if (localRecord.deleted && !remoteRecord.deleted) {
        // Remote record was restored
        mergedVault.records[recordId] = remoteRecord;
      } else if (!localRecord.deleted && remoteRecord.deleted) {
        // Record was deleted remotely
        mergedVault.records[recordId] = remoteRecord;
      } else if (localRecord.last_modified !== remoteRecord.last_modified) {
        // Conflict - use last write wins
        const localDate = new Date(localRecord.last_modified);
        const remoteDate = new Date(remoteRecord.last_modified);

        if (remoteDate > localDate) {
          mergedVault.records[recordId] = remoteRecord;
        }
        conflictsResolved++;
      }
    }

    // Merge labels (simplified - in a real implementation, you'd need to decrypt and compare)
    for (const [labelId, remoteLabel] of Object.entries(remoteVault.labels)) {
      if (!localVault.labels[labelId]) {
        mergedVault.labels[labelId] = remoteLabel;
      }
    }

    // Merge templates (simplified - in a real implementation, you'd need to decrypt and compare)
    for (const [templateId, remoteTemplate] of Object.entries(remoteVault.templates)) {
      if (!localVault.templates[templateId]) {
        mergedVault.templates[templateId] = remoteTemplate;
      }
    }

    return {mergedVault, conflictsResolved};
  }

  /**
   * Get WebDAV file path from configuration
   */
  private getWebDAVFilePath(): string {
    if (!this.webdavConfig) {
      throw new Error('WebDAV configuration not initialized');
    }

    // Use custom path if provided, otherwise default to '/password-manager/vault.json'
    const customPath = this.webdavConfig.path;
    if (customPath) {
      // Normalize path - ensure it starts with a slash
      return customPath.startsWith('/') ? customPath : `/${customPath}`;
    }

    return '/password-manager/vault.json';
  }

  /**
   * Get WebDAV directory path from configuration
   */
  private getWebDAVDirectory(): string {
    if (!this.webdavConfig) {
      throw new Error('WebDAV configuration not initialized');
    }

    const filePath = this.getWebDAVFilePath();

    // Extract directory from file path
    const lastSlashIndex = filePath.lastIndexOf('/');
    if (lastSlashIndex <= 0) {
      return ''; // Root directory
    }

    return filePath.substring(0, lastSlashIndex);
  }

  /**
   * Load vault from remote storage
   */
  private async loadRemoteVault(): Promise<Vault | null> {
    if (!this.storageAdapter) {
      throw new Error('Storage adapter not initialized');
    }

    const vaultPath = this.getWebDAVFilePath();

    try {
      // Try to download the file
      const remoteData = await this.storageAdapter.download(vaultPath);
      return JSON.parse(remoteData) as Vault;
    } catch (error) {
      // File might not exist yet, which is fine
      if (error instanceof Error && error.message.includes('File not found')) {
        return null;
      }

      // For any other error, assume the file doesn't exist
      return null;
    }
  }

  /**
   * Save vault to remote storage
   */
  private async saveRemoteVault(vault: Vault): Promise<void> {
    if (!this.storageAdapter) {
      throw new Error('Storage adapter not initialized');
    }

    const vaultPath = this.getWebDAVFilePath();
    const directoryPath = this.getWebDAVDirectory();

    try {
      const vaultJson = JSON.stringify(vault, null, 2);

      // First, ensure the directory exists (unless it's the root directory)
      if (directoryPath && directoryPath !== '/') {
        try {
          await this.storageAdapter.createDirectory(directoryPath);
        } catch (dirError) {
          // Directory might already exist, which is fine
          if (dirError instanceof Error && !dirError.message.includes('Method Not Allowed')) {
            throw dirError;
          }
        }
      }

      // Save the vault file in the directory
      await this.storageAdapter.upload(vaultPath, vaultJson, {
        overwrite: true
      });
    } catch (error) {
      throw error;
    }
  }

  /**
   * Push local vault to remote storage
   * This method uploads local changes to remote storage
   */
  async push(localVault: Vault): Promise<PushResult> {
    if (!this.storageAdapter) {
      return {
        success: false,
        error: 'Storage adapter not initialized',
        recordsPushed: 0,
        conflictsResolved: 0,
        timestamp: new Date().toISOString()
      };
    }

    this.syncStatus.syncing = true;
    this.syncStatus.lastError = undefined;

    try {
      // Load remote vault
      const remoteVault = await this.loadRemoteVault();

      // Generate new sync version ID
      const newVersionId = this.generateSyncVersionId();
      let finalVault = localVault;
      let conflictsResolved = 0;

      if (!remoteVault) {
        // No remote vault - push local vault
        finalVault = {
          ...localVault,
          history: [...(localVault.history || []), newVersionId]
        };
      } else {
        // Check history relationship
        const localHistory = localVault.history || [];
        const remoteHistory = remoteVault.history || [];

        // Handle different history scenarios
        if (this.isHistoryPrefix(remoteHistory, localHistory)) {
          // Remote is a prefix of local - local is newer, push it
          finalVault = {
            ...localVault,
            history: [...localHistory, newVersionId]
          };
        } else if (this.isHistoryPrefix(localHistory, remoteHistory)) {
          // Local is a prefix of remote - remote is newer, conflict
          // For push, we still push local but note the conflict
          const mergeResult = await this.mergeVaults(localVault, remoteVault);
          finalVault = {
            ...mergeResult.mergedVault,
            history: [...localHistory, newVersionId]
          };
          conflictsResolved = mergeResult.conflictsResolved;
        } else {
          // Divergent histories - merge and push
          const mergeResult = await this.mergeVaults(localVault, remoteVault);
          finalVault = {
            ...mergeResult.mergedVault,
            history: [...localHistory, newVersionId]
          };
          conflictsResolved = mergeResult.conflictsResolved;
        }
      }

      // Save merged vault to remote
      await this.saveRemoteVault(finalVault);

      // Update sync status
      this.syncStatus.syncing = false;
      this.syncStatus.lastSync = new Date().toISOString();
      this.syncStatus.pendingChanges = 0;

      return {
        success: true,
        recordsPushed: Object.keys(finalVault.records).length,
        conflictsResolved,
        timestamp: this.syncStatus.lastSync
      };
    } catch (error) {
      this.syncStatus.syncing = false;
      this.syncStatus.lastError = `Push failed: ${error}`;

      return {
        success: false,
        error: this.syncStatus.lastError,
        recordsPushed: 0,
        conflictsResolved: 0,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Pull remote vault to local
   * This method downloads remote changes and updates the local vault
   * @param localVault
   * @param password User password for KDF configuration update if needed
   */
  async pull(localVault: Vault, password: string): Promise<PullResult> {
    if (!this.storageAdapter) {
      return {
        success: false,
        error: 'Storage adapter not initialized',
        recordsPulled: 0,
        conflictsResolved: 0,
        vaultUpdated: false,
        timestamp: new Date().toISOString()
      };
    }

    this.syncStatus.syncing = true;
    this.syncStatus.lastError = undefined;

    try {
      // Step 1: Load remote vault
      const remoteVault = await this.loadRemoteVault();

      if (!remoteVault) {
        // No remote vault - nothing to pull
        this.syncStatus.syncing = false;
        return {
          success: true,
          recordsPulled: 0,
          conflictsResolved: 0,
          vaultUpdated: false,
          timestamp: new Date().toISOString()
        };
      }

      // Step 2: Update KDF configuration if remote config exists and password is provided
      const remoteKdfConfig = remoteVault.kdf;
      let kdfUpdated = false;

      if (remoteKdfConfig && password) {
        try {
          // Let updateKDFConfig decide if update is needed and return whether it was updated
          kdfUpdated = await this.vaultManager.updateKDFConfig(remoteKdfConfig, password);

          if (kdfUpdated) {
            // After KDF update, reload the local vault to get the updated state
            await this.vaultManager.loadVaultFromStorage();
            // Use the updated local vault for merging
            localVault = this.vaultManager.getVault();
          }
        } catch (kdfError) {
          console.warn('Failed to update KDF configuration during pull:', kdfError);
          // If KDF update fails, continue with the original local vault
        }
      }

      // Step 3: Check history relationship and merge
      const localHistory = localVault.history || [];
      const remoteHistory = remoteVault.history || [];

      let finalVault = localVault;
      let conflictsResolved = 0;
      let vaultUpdated = false;

      if (this.isHistoryPrefix(localHistory, remoteHistory)) {
        // Local is a prefix of remote - remote is newer, use it
        finalVault = {
          ...remoteVault,
          history: [...remoteHistory] // Keep remote history as is
        };
        vaultUpdated = true;
      } else if (this.isHistoryPrefix(remoteHistory, localHistory)) {
        // Remote is a prefix of local - local is newer, nothing to pull
        finalVault = localVault;
        vaultUpdated = false;
      } else {
        // Divergent histories - merge
        const mergeResult = await this.mergeVaults(localVault, remoteVault);
        finalVault = {
          ...mergeResult.mergedVault,
          history: [...remoteHistory] // Use remote history after pull
        };
        conflictsResolved = mergeResult.conflictsResolved;
        vaultUpdated = true;
      }

      // Step 4: Update sync status
      this.syncStatus.syncing = false;
      this.syncStatus.lastSync = new Date().toISOString();

      return {
        success: true,
        recordsPulled: vaultUpdated ? Object.keys(finalVault.records).length : 0,
        conflictsResolved,
        vaultUpdated,
        timestamp: this.syncStatus.lastSync,
        // Include the merged vault for the caller to update local storage
        mergedVault: vaultUpdated ? finalVault : undefined,
        // Include KDF update information
        kdfUpdated,
        remoteKdfConfig: kdfUpdated ? remoteKdfConfig : undefined
      } as PullResult;
    } catch (error) {
      this.syncStatus.syncing = false;
      this.syncStatus.lastError = `Pull failed: ${error}`;

      return {
        success: false,
        error: this.syncStatus.lastError,
        recordsPulled: 0,
        conflictsResolved: 0,
        vaultUpdated: false,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Test WebDAV connection with provided configuration
   * @param config WebDAV configuration to test
   * @returns True if connection is successful, false otherwise
   */
  async testWebDAVConnection(config: WebDAVConfig): Promise<boolean> {
    try {
      // Create a temporary storage adapter for testing
      const tempStorage = new WebDAVRemoteStorage(config);
      
      // Test connection by checking if the root directory exists
      await tempStorage.exists('/');
      
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    this.storageAdapter = null;
  }
}