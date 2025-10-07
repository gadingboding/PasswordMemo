/**
 * Sync Manager
 *
 * Handles data synchronization with remote storage using remote storage implementations.
 * Implements the history-based synchronization strategy as described in the design.
 */

import {v4 as uuidv4} from 'uuid';
import {Vault, WebDAVConfig} from './types/vault.js';
import {PullResult, PushResult, SyncStatus} from './types/sync.js';
import {DataManager} from './DataManager.js';
import {IRemoteStorage, WebDAVRemoteStorage} from './RemoteStorage.js';
import {CryptographyEngine} from "./CryptoEngine.js";

/**
 * Sync Manager for handling synchronization
 */
export class Sync {
  private storageAdapter: IRemoteStorage | null = null;
  private vaultManager: DataManager;
  private webdavConfig: WebDAVConfig | null = null;
  private syncStatus: SyncStatus = {
    syncing: false,
    pendingChanges: 0
  };

  constructor(vaultManager: DataManager) {
    this.vaultManager = vaultManager;
  }

  /**
   * Initialize storage adapter with configuration
   */
  async initializeStorage(config?: WebDAVConfig): Promise<void> {
    try {
      if (!config) {
        config = (await this.vaultManager.getWebDAVConfig())!;
      }
      this.webdavConfig = config;
      this.storageAdapter = new WebDAVRemoteStorage(config);
    } catch (error) {
      throw new Error(`Storage connection failed: ${error}`);
    }
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
      kdf: localVault.kdf,
      sentinel: localVault.sentinel // sentinel将在KDF更新后重新生成
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
   * Get WebDAV paths from configuration
   * @returns Object containing both file path and directory path
   */
  private getWebDAVPaths(): { filePath: string; directoryPath: string } {
    if (!this.webdavConfig) {
      throw new Error('WebDAV configuration not initialized');
    }

    // Use custom path if provided, otherwise default to '/password-manager/vault.json'
    let filePath: string;
    const customPath = this.webdavConfig.path;
    if (customPath) {
      // Normalize path - ensure it starts with a slash
      filePath = customPath.startsWith('/') ? customPath : `/${customPath}`;
    } else {
      filePath = '/password-manager/vault.json';
    }

    // Extract directory from file path
    const lastSlashIndex = filePath.lastIndexOf('/');
    let directoryPath: string;
    if (lastSlashIndex <= 0) {
      directoryPath = ''; // Root directory
    } else {
      directoryPath = filePath.substring(0, lastSlashIndex);
    }

    return {filePath, directoryPath};
  }

  /**
   * 对齐本地和远程KDF配置
   * @param remoteVault 远程保险库
   * @param localVault 本地保险库
   * @param password 用户密码
   * @returns 对齐结果
   */
  private async alignKdfConfigurations(
    remoteVault: Vault,
    localVault: Vault,
    password?: string
  ): Promise<{
    success: boolean;
    error?: string;
    passwordRequired?: boolean;
    kdfUpdated?: boolean;
  }> {
    const remoteKdfConfig = remoteVault.kdf!;
    const localKdfConfig = localVault.kdf!;

    if (this.vaultManager.kdfManager.areConfigsCompatible(remoteKdfConfig, localKdfConfig)) {
      let result = await CryptographyEngine.validateMasterKey(remoteVault.sentinel!, this.vaultManager.getMasterKey()!);
      if (!result.success) {
        return {success: false, error: 'Mismatched remote sentinel'};
      }
      return {success: true, kdfUpdated: false};
    }

    if (!password) {
      return {
        success: false,
        error: 'Password required for KDF configuration alignment',
        passwordRequired: true
      };
    }

    try {
      await this.vaultManager.updateKDFConfig(remoteKdfConfig, password);
      // 验证远程sentinel是否可以用新的master key解密
      const newMasterKey = this.vaultManager.getMasterKey()!;
      const sentinelValidation = await CryptographyEngine.validateMasterKey(remoteVault.sentinel!, newMasterKey);
      if (!sentinelValidation.success) {
        // 还不能解密说明远端数据存在问题，失败返回并重置回之前的kdf配置
        await this.vaultManager.updateKDFConfig(localKdfConfig, password);
        return {
          success: false,
          error: 'Invalid remote sentinel'
        };
      }
      await this.vaultManager.updateSentinel(newMasterKey);
      localVault.sentinel = remoteVault.sentinel;
      return {success: true, kdfUpdated: true};
    } catch (kdfError) {
      return {
        success: false,
        error: `KDF configuration update failed: ${kdfError instanceof Error ? kdfError.message : 'Unknown error'}`
      };
    }
  }

  /**
   * 处理本地和远程保险库的历史关系
   * @param localVault 本地保险库
   * @param remoteVault 远程保险库
   * @returns 处理结果
   */
  private async handleHistoryRelationship(
    localVault: Vault,
    remoteVault: Vault
  ): Promise<{
    mergedVault: Vault;
    conflictsResolved: number;
    vaultUpdated: boolean;
    localHasChanges: boolean;
    remoteHasChanges: boolean;
  }> {
    const localHistory = localVault.history || [];
    const remoteHistory = remoteVault.history || [];

    // 统一的合并逻辑
    let mergedVault: Vault;
    let conflictsResolved = 0;
    let vaultUpdated = false;
    let localHasChanges = false;
    let remoteHasChanges = false;

    if (this.isHistoryPrefix(localHistory, remoteHistory)) {
      // 本地是远程前缀 - 远程有新变更，需要先合并远程变更到本地
      const mergeResult = await this.mergeVaults(localVault, remoteVault);
      mergedVault = mergeResult.mergedVault;
      conflictsResolved = mergeResult.conflictsResolved;
      vaultUpdated = true;
      remoteHasChanges = true;
      // 保持远程历史，但包含本地数据
      mergedVault.history = remoteVault.history;
    } else if (this.isHistoryPrefix(remoteHistory, localHistory)) {
      // 远程是本地前缀 - 本地有新变更
      mergedVault = localVault;
      vaultUpdated = false; // 合并逻辑不负责判断是否需要更新
      localHasChanges = true;
    } else {
      // 分支历史 - 需要合并
      const mergeResult = await this.mergeVaults(localVault, remoteVault);
      mergedVault = mergeResult.mergedVault;
      conflictsResolved = mergeResult.conflictsResolved;
      vaultUpdated = true;
      localHasChanges = true;
      remoteHasChanges = true;
    }
    mergedVault.sentinel = remoteVault.sentinel
    return {
      mergedVault,
      conflictsResolved,
      vaultUpdated,
      localHasChanges,
      remoteHasChanges
    };
  }

  /**
   * Load vault from remote storage
   */
  async loadRemoteVault(): Promise<Vault | null> {
    if (!this.storageAdapter) {
      throw new Error('Storage adapter not initialized');
    }

    const {filePath: vaultPath} = this.getWebDAVPaths();

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
  async saveRemoteVault(vault: Vault): Promise<void> {
    if (!this.storageAdapter) {
      throw new Error('Storage adapter not initialized');
    }

    const {filePath: vaultPath, directoryPath} = this.getWebDAVPaths();

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
   * @param localVault Local vault to push
   * @param password Optional user password for KDF configuration update if needed
   */
  async push(localVault: Vault, password?: string): Promise<PushResult> {
    if (password) {
      const validationResult = await this.vaultManager.validatePassword(password);
      if (!validationResult.success) {
        return {
          success: false,
          error: 'Invalid master password',
          recordsPushed: 0,
          conflictsResolved: 0,
          timestamp: new Date().toISOString()
        };
      }
    }

    this.syncStatus.syncing = true;
    this.syncStatus.lastError = undefined;

    try {
      // Load remote vault
      const remoteVault = await this.loadRemoteVault();

      if (!remoteVault) {
        // No remote vault - just push local vault
        const currentVault = this.vaultManager.getVault();
        const finalVault = {
          ...localVault,
          history: [...(localVault.history || []), this.generateSyncVersionId()],
          sentinel: currentVault.sentinel
        };

        await this.saveRemoteVault(finalVault);

        this.syncStatus.syncing = false;
        this.syncStatus.lastSync = new Date().toISOString();
        this.syncStatus.pendingChanges = 0;

        return {
          success: true,
          recordsPushed: Object.keys(finalVault.records).length,
          conflictsResolved: 0,
          timestamp: this.syncStatus.lastSync
        };
      }

      // KDF configuration alignment
      const kdfResult = await this.alignKdfConfigurations(remoteVault, localVault, password);
      if (!kdfResult.success) {
        return {
          success: false,
          error: kdfResult.error,
          recordsPushed: 0,
          conflictsResolved: 0,
          timestamp: new Date().toISOString(),
          passwordRequired: kdfResult.passwordRequired
        };
      }

      // Handle history relationship
      const historyResult = await this.handleHistoryRelationship(localVault, remoteVault);
      let finalVault = historyResult.mergedVault;
      const conflictsResolved = historyResult.conflictsResolved;

      // Push操作：每次push都应该添加新版本ID，表示远程被更新了一次
      const newVersionId = this.generateSyncVersionId();
      finalVault = {
        ...finalVault,
        history: [...(finalVault.history || []), newVersionId]
      };

      // Save merged vault to remote
      await this.saveRemoteVault(finalVault);

      // 更新本地vault的历史记录以保持同步
      // 无论是否有远程变更，都要更新本地历史记录以包含新的版本ID
      this.vaultManager.setVault({
        ...this.vaultManager.getVault(),
        history: [...(finalVault.history || [])]
      });
      await this.vaultManager.saveVault();

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
   * @param localVault Local vault to merge with remote
   * @param password Optional user password for KDF configuration update if needed
   */
  async pull(localVault: Vault, password?: string): Promise<PullResult> {
    if (password) {
      const validationResult = await this.vaultManager.validatePassword(password);
      if (!validationResult.success) {
        return {
          success: false,
          error: 'Invalid master password',
          recordsPulled: 0,
          conflictsResolved: 0,
          vaultUpdated: false,
          timestamp: new Date().toISOString()
        };
      }
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

      // KDF configuration alignment
      const kdfResult = await this.alignKdfConfigurations(remoteVault, localVault, password);
      if (!kdfResult.success) {
        return {
          success: false,
          error: kdfResult.error,
          recordsPulled: 0,
          conflictsResolved: 0,
          vaultUpdated: false,
          timestamp: new Date().toISOString(),
          passwordRequired: kdfResult.passwordRequired
        };
      }

      // Handle history relationship
      const historyResult = await this.handleHistoryRelationship(localVault, remoteVault);
      let finalVault = historyResult.mergedVault;
      const conflictsResolved = historyResult.conflictsResolved;
      let vaultUpdated = historyResult.vaultUpdated;

      // Pull操作：当远程有变更时，保持远程历史
      if (historyResult.remoteHasChanges) {
        finalVault = {
          ...finalVault,
          history: [...(remoteVault.history || [])]
        };
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
    this.webdavConfig = null;
  }
}