/**
 * Password Manager - Unified Interface
 *
 * This class provides a simplified, unified interface for the password manager,
 * hiding the complexity of internal components and providing a clean API for users.
 */

import {
  DecryptedVaultRecord,
  DEFAULT_KDF_CONFIG,
  MasterPassword,
  PullResult,
  PushResult,
  SyncConfig,
  SyncStatus,
  TemplateField,
  VaultLabel,
  VaultTemplate,
  PasswordComplexityResult
} from './types/index.js';


import {VaultManager} from './vault-manager.js';
import {ConfigurationManager} from './configuration-manager.js';
import {EnvironmentManager} from './environment-manager.js';
import {CryptographyEngine} from './crypto-engine.js';
import {SyncManager} from './sync-manager.js';
import {WebDAVConfig} from './types/vault.js';
import {KDFManager} from './kdf-manager.js';
import {DEFAULT_STORAGE_NAMESPACE, STORAGE_KEYS} from './constants.js';

/**
 * Password Manager initialization configuration
 */
export interface PasswordManagerConfig {
  /** Storage configuration */
  storage?: {
    /** Base storage path */
    basePath?: string;
    /** Storage namespace */
    namespace?: string;
  },

  /** WebDAV configuration for remote storage */
  webdav?: WebDAVConfig,

  /** Whether to pull remote vault after WebDAV configuration */
  pullRemoteVault?: boolean
}

/**
 * Password Manager initialization parameters
 */
export interface InitializeParams {
  /** Configuration */
  config?: PasswordManagerConfig,
  /** Master password for initialization */
  masterPassword?: MasterPassword
}

/**
 * Authentication result with session information
 * Note: This is a single-user password manager, no real user concept
 */
export interface AuthResult {
  /** Whether authentication was successful */
  success: boolean;
  /** Error message if authentication failed */
  error?: string;
}

/**
 * Unified Password Manager class
 */
export class PasswordManager {
  private vaultManager: VaultManager;
  private configManager: ConfigurationManager;
  private environmentManager: EnvironmentManager;
  private syncManager: SyncManager;
  private kdfManager: KDFManager;
  private initialized: boolean = false;
  private static instance: PasswordManager | null = null;

  private constructor() {
    this.environmentManager = EnvironmentManager.getInstance();
    this.vaultManager = new VaultManager();
    this.configManager = new ConfigurationManager();
    this.kdfManager = new KDFManager();
    this.syncManager = new SyncManager(this.configManager, new CryptographyEngine(), this.vaultManager);
  }

  /**
   * Get the singleton instance of PasswordManager
   */
  static getInstance(): PasswordManager {
    if (!PasswordManager.instance) {
      PasswordManager.instance = new PasswordManager();
    }
    return PasswordManager.instance;
  }

  /**
   * Initialize the password manager
   * @param params Initialization parameters including config and master password
   */
  async initialize(params: InitializeParams = {}): Promise<void> {
    if (this.initialized) {
      return;
    }

    const {config = {}, masterPassword} = params;

    try {
      // Configure storage
      const storageConfig = {
        baseDir: config.storage?.basePath,
        namespace: config.storage?.namespace || DEFAULT_STORAGE_NAMESPACE
      };

      this.environmentManager.getStorage(storageConfig);

      // Initialize sodium for cryptography
      // Note: setSodiumReady is imported from index.ts in the test, but not available here
      // We'll need to ensure sodium is initialized before using the password manager

      const syncConfig: SyncConfig = {
        maxRetries: 3,
        retryDelay: 5000
      };
      this.syncManager.configureSync(syncConfig);

      // Check if already initialized - if so, just mark as initialized and return
      const isAlreadyInitialized = await this.isInitialized();
      if (isAlreadyInitialized) {
        this.initialized = true;
        return;
      }

      // Check if user profile exists
      const userProfile = await this.configManager.loadUserProfile();
      const vaultExists = await this.vaultManager.loadVaultFromStorage();
      const uninitialized = !userProfile || !vaultExists;

      if (uninitialized) {
        // For new initialization, we need a master password
        if (!masterPassword) {
          throw new Error('Master password is required for initialization');
        }
        const complexity = this.checkPasswordComplexity(masterPassword);
        // Validate password strength
        if (!complexity.isAcceptable) {
          throw new Error(`Password is too weak. ${complexity.warning.join(' ')} ${complexity.suggestions.join(' ')}`);
        }

        // Initialize vault KDF configuration with a unique salt for KDF
        const kdfSalt = await CryptographyEngine.generateSalt();
        const kdfConfig = {
          ...DEFAULT_KDF_CONFIG,
          params: {
            ...DEFAULT_KDF_CONFIG.params,
            salt: kdfSalt
          }
        };
        this.vaultManager.setKDFConfig(kdfConfig);

        // Derive master key from password
        const masterKeyResult = await this.kdfManager.deriveKey(masterPassword, kdfConfig);
        await this.vaultManager.setMasterKey(masterKeyResult.key);

        // Create user profile first before saving WebDAV config
        await this.configManager.saveUserProfile({});

        // Handle WebDAV configuration if provided
        if (config.webdav) {
          // Initialize storage adapter
          await this.syncManager.initializeStorage(config.webdav);

          // Try to load remote vault if pullRemoteVault is true
          if (config.pullRemoteVault) {
            const remoteVault = await this.syncManager['loadRemoteVault']();

            if (remoteVault) {
              // Remote vault exists, use its KDF configuration and master key
              if (remoteVault.kdf) {
                // Use remote vault's KDF configuration
                this.vaultManager.setKDFConfig(remoteVault.kdf);

                // Derive master key using remote vault's KDF config
                const remoteMasterKeyResult = await this.kdfManager.deriveKey(masterPassword, remoteVault.kdf);
                await this.vaultManager.updateSentinel(remoteMasterKeyResult.key)
                await this.vaultManager.setMasterKey(remoteMasterKeyResult.key);

                // Load remote vault into local vault manager
                this.vaultManager.loadVault(remoteVault);

                // Save remote vault to local storage for offline access
                await this.vaultManager.saveVault();

                // Save WebDAV configuration with remote master key
                await this.configManager.saveWebDAVConfig(config.webdav, remoteMasterKeyResult.key);
              } else {
                throw new Error('Remote vault does not contain KDF configuration');
              }
            } else {
              // Remote vault doesn't exist, create a new one with local KDF config
              // Save vault to storage
              await this.vaultManager.saveVault();

              // Save WebDAV configuration with local master key
              await this.configManager.saveWebDAVConfig(config.webdav, masterKeyResult.key);
            }
          } else {
            // Don't pull remote vault, just create local vault
            // Save vault to storage
            await this.vaultManager.saveVault();

            // Save WebDAV configuration with local master key
            await this.configManager.saveWebDAVConfig(config.webdav, masterKeyResult.key);
          }
        } else {
          // No WebDAV configuration, just create local vault
          // Save vault to storage
          await this.vaultManager.saveVault();
        }
      } else {
        // Already initialized, just set up the environment
        // Handle WebDAV configuration if provided
        if (config.webdav) {
          // Initialize storage adapter
          await this.syncManager.initializeStorage(config.webdav);
        }
      }

      this.initialized = true;
    } catch (error) {
      throw new Error(`Failed to initialize password manager: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Check if the password manager is initialized
   * This method can be called before initialization to check status
   * @param storageConfig Optional storage configuration if not yet initialized
   * @returns True if both vault and user profile exist, false otherwise
   */
  async isInitialized(storageConfig?: { basePath?: string; namespace?: string }): Promise<boolean> {
    try {
      if (!this.initialized && storageConfig) {
        // For uninitialized state, check directly without side effects
        return await this.checkInitializationStatusDirectly(storageConfig);
      } else {
        // Already initialized, use existing managers
        const userProfile = await this.configManager.loadUserProfile();
        if (!userProfile) {
          return false;
        }
        return await this.vaultManager.loadVaultFromStorage();
      }
    } catch (error) {
      return false;
    }
  }

  /**
   * Check initialization status directly without side effects
   * @private
   */
  private async checkInitializationStatusDirectly(storageConfig: {
    basePath?: string;
    namespace?: string
  }): Promise<boolean> {
    try {
      const environment = this.environmentManager.getEnvironment();
      const namespace = storageConfig.namespace || DEFAULT_STORAGE_NAMESPACE;

      if (environment === 'browser') {
        const parts = storageConfig.basePath ? [namespace, storageConfig.basePath] : [namespace];
        const userProfileKey = [...parts, STORAGE_KEYS.USER_PROFILE].join(':');
        const vaultKey = [...parts, STORAGE_KEYS.VAULT_DATA].join(':');
        return localStorage.getItem(userProfileKey) !== null && localStorage.getItem(vaultKey) !== null;
      } else {
        // For Node.js, check file system directly
        const {join} = await import('path');
        const {promises: fs} = await import('fs');

        const baseDir = storageConfig.basePath || './data';
        const userProfilePath = join(baseDir, namespace, `${STORAGE_KEYS.USER_PROFILE}.json`);
        const vaultPath = join(baseDir, namespace, `${STORAGE_KEYS.VAULT_DATA}.json`);

        try {
          await fs.access(userProfilePath);
        } catch {
          return false;
        }

        try {
          await fs.access(vaultPath);
          return true;
        } catch {
          return false;
        }
      }
    } catch (error) {
      return false;
    }
  }

  /**
   * Ensure the password manager is initialized
   * @private
   */
  private ensureInitialized(): void {
    if (!this.initialized) {
      throw new Error('Password manager is not initialized. Call initialize() first.');
    }
  }

  async authenticateII(password: MasterPassword): Promise<AuthResult> {

    try {
      // Get KDF configuration from vault
      const kdfConfig = this.vaultManager.getKDFConfig();
      if (!kdfConfig) {
        return {
          success: false,
          error: 'KDF configuration not found in vault'
        };
      }
      const masterKeyResult = await this.kdfManager.deriveKey(password, kdfConfig);
      await this.vaultManager.setMasterKey(masterKeyResult.key);
      return {success: true};
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Authentication failed'
      };
    }
  }


  /**
   * Authenticate user with credentials
   * @param password Master Password
   */
  async authenticate(password: MasterPassword): Promise<AuthResult> {
    this.ensureInitialized();
    try {
      await this.configManager.loadUserProfile();
      const authResult = await this.authenticateII(password);
      if (authResult.success) {
        await this.vaultManager.loadVaultFromStorage();
      }
      return authResult
    } catch (error) {
      return {success: false, error: error instanceof Error ? error.message : 'Authentication failed'};
    }
  }

  /**
   * Lock the vault (clear master key from memory)
   */
  lock(): void {
    this.ensureInitialized();
    this.vaultManager.clearMasterKey();
  }

  /**
   * Check if the vault is unlocked
   */
  isUnlocked(): boolean {
    this.ensureInitialized();
    return this.vaultManager.isUnlocked();
  }

  // === RECORD MANAGEMENT ===

  /**
   * Create a new record
   * @param templateId Template ID
   * @param title Record title
   * @param fieldData Field data (field name to value mapping)
   * @param labelIds Label IDs array
   */
  async createRecord(
    templateId: string,
    title: string,
    fieldData: Record<string, string>,
    labelIds: string[] = []
  ): Promise<string> {
    this.ensureInitialized();

    if (!this.isUnlocked()) {
      throw new Error('Vault is locked. Please authenticate first.');
    }

    try {
      // Get template to retrieve field IDs
      const template = await this.vaultManager.getTemplate(templateId);
      if (!template) {
        throw new Error('Template not found');
      }

      // Map field names to IDs
      const fieldIdMap: Record<string, string> = {};
      template.fields.forEach(field => {
        fieldIdMap[field.name] = field.id;
      });

      // Convert field data to use field IDs
      const recordFields: Record<string, string> = {};
      for (const [fieldName, value] of Object.entries(fieldData)) {
        const fieldId = fieldIdMap[fieldName];
        if (fieldId) {
          recordFields[fieldId] = value;
        }
      }

      return await this.vaultManager.createRecord(templateId, title, recordFields, labelIds);
    } catch (error) {
      throw new Error(`Failed to create record: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get record details
   * @param recordId Record ID
   */
  async getRecord(recordId: string): Promise<DecryptedVaultRecord | null> {
    this.ensureInitialized();

    if (!this.isUnlocked()) {
      throw new Error('Vault is locked. Please authenticate first.');
    }

    return await this.vaultManager.getRecord(recordId);
  }

  /**
   * Update a record
   * @param recordId Record ID
   * @param updates Update content
   */
  async updateRecord(
    recordId: string,
    updates: {
      title?: string;
      fieldData?: Record<string, string>;
      labelIds?: string[];
    }
  ): Promise<void> {
    this.ensureInitialized();

    if (!this.isUnlocked()) {
      throw new Error('Vault is locked. Please authenticate first.');
    }

    try {
      // Get the current record
      const currentRecord = await this.vaultManager.getRecord(recordId);
      if (!currentRecord) {
        throw new Error('Record not found');
      }

      // Get template to retrieve field IDs
      const template = await this.vaultManager.getTemplate(currentRecord.template);
      if (!template) {
        throw new Error('Template not found');
      }

      // Prepare update data for VaultManager
      const vaultUpdates: any = {};

      if (updates.title !== undefined) {
        vaultUpdates.title = updates.title;
      }

      if (updates.fieldData !== undefined) {
        // Map field names to IDs
        const fieldIdMap: Record<string, string> = {};
        template.fields.forEach(field => {
          fieldIdMap[field.name] = field.id;
        });

        // Convert field data to use field IDs
        const recordFields: Record<string, string> = {};
        for (const [fieldName, value] of Object.entries(updates.fieldData)) {
          const fieldId = fieldIdMap[fieldName];
          if (fieldId) {
            recordFields[fieldId] = value;
          }
        }

        vaultUpdates.fields = recordFields;
      }

      if (updates.labelIds !== undefined) {
        vaultUpdates.labels = updates.labelIds;
      }

      await this.vaultManager.updateRecord(recordId, vaultUpdates);
    } catch (error) {
      throw new Error(`Failed to update record: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Delete a record
   * @param recordId Record ID
   */
  async deleteRecord(recordId: string): Promise<void> {
    this.ensureInitialized();

    if (!this.isUnlocked()) {
      throw new Error('Vault is locked. Please authenticate first.');
    }

    await this.vaultManager.deleteRecord(recordId);
  }

  /**
   * Get all records list (only basic information)
   */
  async getRecordList(): Promise<Array<{
    id: string;
    title: string;
    template: string;
    labels: string[];
    lastModified: string;
  }>> {
    this.ensureInitialized();

    if (!this.isUnlocked()) {
      throw new Error('Vault is locked. Please authenticate first.');
    }

    const records = await this.vaultManager.getRecordList();

    // Transform the format to match our interface
    return records.map(record => ({
      id: record.id,
      title: record.title,
      template: record.template,
      labels: record.labels,
      lastModified: record.last_modified
    }));
  }

  // === TEMPLATE MANAGEMENT ===

  /**
   * Create a template
   * @param name Template name
   * @param fields Field definition array
   */
  async createTemplate(
    name: string,
    fields: TemplateField[]
  ): Promise<string> {
    this.ensureInitialized();

    if (!this.isUnlocked()) {
      throw new Error('Vault is locked. Please authenticate first.');
    }

    // Ensure all fields have IDs
    const processedFields = fields.map(field => ({
      ...field,
      id: field.id || crypto.randomUUID(),
      optional: !field.optional // Convert required to optional (opposite boolean)
    }));

    return await this.vaultManager.createTemplate(name, processedFields);
  }

  /**
   * Get template details
   * @param templateId Template ID
   */
  async getTemplate(templateId: string): Promise<VaultTemplate | null> {
    this.ensureInitialized();

    if (!this.isUnlocked()) {
      throw new Error('Vault is locked. Please authenticate first.');
    }

    const template = await this.vaultManager.getTemplate(templateId);

    if (!template) {
      return null;
    }

    return {
      name: template.name,
      fields: template.fields
    };
  }

  /**
   * Get all templates list
   */
  async getTemplateList(): Promise<Array<{
    id: string;
    name: string;
    fieldCount: number;
  }>> {
    this.ensureInitialized();

    if (!this.isUnlocked()) {
      throw new Error('Vault is locked. Please authenticate first.');
    }

    return await this.vaultManager.getTemplateList();
  }

  // === LABEL MANAGEMENT ===

  /**
   * Create a label
   * @param name Label name
   * @param color Label color (hex format)
   */
  async createLabel(name: string, color: string): Promise<string> {
    this.ensureInitialized();

    if (!this.isUnlocked()) {
      throw new Error('Vault is locked. Please authenticate first.');
    }

    return await this.vaultManager.createLabel(name, color);
  }

  /**
   * Get label details
   * @param labelId Label ID
   */
  async getLabel(labelId: string): Promise<VaultLabel | null> {
    this.ensureInitialized();

    if (!this.isUnlocked()) {
      throw new Error('Vault is locked. Please authenticate first.');
    }

    const label = await this.vaultManager.getLabel(labelId);

    if (!label) {
      return null;
    }

    return {
      name: label.name,
      color: label.color
    };
  }

  /**
   * Update a label
   * @param labelId Label ID
   * @param updates Update content
   */
  async updateLabel(
    labelId: string,
    updates: {
      name?: string;
      color?: string;
    }
  ): Promise<void> {
    this.ensureInitialized();

    if (!this.isUnlocked()) {
      throw new Error('Vault is locked. Please authenticate first.');
    }

    await this.vaultManager.updateLabel(labelId, updates);
  }

  /**
   * Delete a label
   * @param labelId Label ID
   */
  async deleteLabel(labelId: string): Promise<void> {
    this.ensureInitialized();

    if (!this.isUnlocked()) {
      throw new Error('Vault is locked. Please authenticate first.');
    }

    await this.vaultManager.deleteLabel(labelId);
  }

  /**
   * Get all labels list
   */
  async getLabelList(): Promise<VaultLabel[]> {
    this.ensureInitialized();

    if (!this.isUnlocked()) {
      throw new Error('Vault is locked. Please authenticate first.');
    }

    const labels = await this.vaultManager.getLabelList();

    return labels.map(label => ({
      id: label.id,
      name: label.name,
      color: label.color
    }));
  }

  // === SETTINGS MANAGEMENT ===
  /**
   * Configure sync settings
   * @param config Sync configuration
   */
  async configureSync(config: SyncConfig): Promise<void> {
    this.ensureInitialized();

    if (!this.isUnlocked()) {
      throw new Error('Vault is locked. Please authenticate first.');
    }

    this.syncManager.configureSync(config);
  }

  /**
   * Configure WebDAV settings
   * @param webdavConfig WebDAV configuration
   */
  async configureWebDAV(webdavConfig: WebDAVConfig): Promise<void> {
    this.ensureInitialized();

    if (!this.isUnlocked()) {
      throw new Error('Vault is locked. Please authenticate first.');
    }

    try {
      // Save WebDAV configuration
      await this.configManager.saveWebDAVConfig(webdavConfig, this.vaultManager.getMasterKey()!);

      // Initialize WebDAV client
      await this.syncManager.initializeStorage(webdavConfig);
    } catch (error) {
      throw new Error(`Failed to configure WebDAV: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Clear WebDAV configuration
   */
  async clearWebDAVConfig(): Promise<void> {
    this.ensureInitialized();

    if (!this.isUnlocked()) {
      throw new Error('Vault is locked. Please authenticate first.');
    }

    try {
      // Clear WebDAV configuration by saving empty config
      await this.configManager.saveWebDAVConfig({
        url: '',
        username: '',
        password: ''
      }, this.vaultManager.getMasterKey()!);
    } catch (error) {
      throw new Error(`Failed to clear WebDAV configuration: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Push local vault to remote storage
   * This method uploads local changes to remote storage
   * @param password Optional user password for KDF configuration update if needed
   */
  async push(password?: string): Promise<PushResult> {
    this.ensureInitialized();
    await this.initializeWebDAVIfConfigured();

    if (!this.isUnlocked()) {
      throw new Error('Vault is locked. Please authenticate first.');
    }

    try {
      const vault = this.vaultManager.getVault();
      return await this.syncManager.push(vault, password);
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Push failed',
        recordsPushed: 0,
        conflictsResolved: 0,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Pull remote vault to local
   * This method downloads remote changes and updates the local vault
   * @param password Optional user password for KDF configuration update if needed
   */
  async pull(password?: string): Promise<PullResult> {
    this.ensureInitialized();
    await this.initializeWebDAVIfConfigured();

    if (!this.isUnlocked()) {
      throw new Error('Vault is locked. Please authenticate first.');
    }

    try {
      const vault = this.vaultManager.getVault();
      const result = await this.syncManager.pull(vault, password);

      // If vault was updated, load the merged vault into local vault manager
      if (result.success && result.vaultUpdated && result.mergedVault) {
        // Load the merged vault data
        this.vaultManager.loadVault(result.mergedVault);

        // Save the updated vault
        await this.vaultManager.saveVault();
      }

      return result;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Pull failed',
        recordsPulled: 0,
        conflictsResolved: 0,
        vaultUpdated: false,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Get sync status
   */
  getSyncStatus(): SyncStatus {
    this.ensureInitialized();
    return this.syncManager.getSyncStatus();
  }

  /**
   * Get current WebDAV configuration (decrypted)
   */
  async getWebDAVConfig(): Promise<WebDAVConfig | null> {
    this.ensureInitialized();

    if (!this.isUnlocked()) {
      throw new Error('Vault is locked. Please authenticate first.');
    }

    try {
      const masterKey = this.vaultManager.getMasterKey();
      if (!masterKey) {
        return null;
      }

      return await this.configManager.loadWebDAVConfig(masterKey);
    } catch (error) {
      return null;
    }
  }

  /**
   * Test WebDAV connection with provided configuration
   * @param config WebDAV configuration to test
   * @returns True if connection is successful, false otherwise
   */
  async testWebDAVConnection(config: WebDAVConfig): Promise<boolean> {
    return await this.syncManager.testWebDAVConnection(config);
  }

  /**
   * Initialize WebDAV client if configuration exists
   * @private
   */
  private async initializeWebDAVIfConfigured(): Promise<void> {
    try {
      const webdavConfig = await this.getWebDAVConfig();
      if (webdavConfig) {
        await this.syncManager.initializeStorage(webdavConfig);
      }
    } catch (error) {
      // Silently ignore WebDAV initialization errors on startup
      console.warn('Failed to initialize WebDAV on unlock:', error);
    }
  }

  // === UTILITY METHODS ===

  /**
   * Save vault data to storage
   * This method allows manual saving of the current vault state
   */
  async saveVault(): Promise<void> {
    this.ensureInitialized();

    if (!this.isUnlocked()) {
      throw new Error('Vault is locked. Please authenticate first.');
    }

    try {
      await this.vaultManager.saveVault();
    } catch (error) {
      throw new Error(`Failed to save vault: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Load vault data from storage
   * This method allows manual loading of vault data from storage
   * @returns True if vault data was loaded successfully, false if no data exists
   */
  async loadVault(): Promise<boolean> {
    this.ensureInitialized();

    if (!this.isUnlocked()) {
      throw new Error('Vault is locked. Please authenticate first.');
    }

    try {
      return await this.vaultManager.loadVaultFromStorage();
    } catch (error) {
      throw new Error(`Failed to load vault: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get the current vault data (raw encrypted format)
   * @returns Current vault data
   */
  getVaultData(): any {
    this.ensureInitialized();

    if (!this.isUnlocked()) {
      throw new Error('Vault is locked. Please authenticate first.');
    }

    return this.vaultManager.getVault();
  }

  /**
   * Load vault data from a provided vault object
   * @param vaultData Vault data to load
   */
  loadVaultData(vaultData: any): void {
    this.ensureInitialized();

    if (!this.isUnlocked()) {
      throw new Error('Vault is locked. Please authenticate first.');
    }

    this.vaultManager.loadVault(vaultData);
  }

  /**
   * Export vault data
   * @param password Export password
   */
  async exportVault(password: string): Promise<string> {
    this.ensureInitialized();

    if (!this.isUnlocked()) {
      throw new Error('Vault is locked. Please authenticate first.');
    }

    // TODO: Implement vault export
    throw new Error('Vault export not yet implemented');
  }

  /**
   * Import vault data
   * @param encryptedData Encrypted vault data
   * @param password Import password
   */
  async importVault(encryptedData: string, password: string): Promise<void> {
    this.ensureInitialized();
    // TODO: Implement vault import
    throw new Error('Vault import not yet implemented');
  }

  /**
   * Reset all data (vault and user profile)
   * This will completely wipe all stored data and reset the password manager to initial state
   */
  async reset(): Promise<void> {
    try {
      // Clear all data from configuration manager
      await this.configManager.clearAll();

      // Clear master key from memory
      this.vaultManager.clearMasterKey();

      // Mark as uninitialized - don't reset vault data in memory
      // This ensures the system will detect as uninitialized on next check
      this.initialized = false;
    } catch (error) {
      throw new Error(`Failed to reset password manager: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Check password complexity using zxcvbn
   * @param password The password to check
   * @param userInputs Optional array of user-specific inputs to exclude from password patterns
   * @returns Password complexity analysis result
   */
  checkPasswordComplexity(password: string, userInputs: string[] = []): PasswordComplexityResult {
    return CryptographyEngine.checkPasswordComplexity(password, userInputs);
  }
}