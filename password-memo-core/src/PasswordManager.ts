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
  SyncStatus,
  TemplateField,
  VaultLabel,
  VaultTemplate,
  PasswordComplexityResult, Vault
} from './types/index.js';


import {DataManager} from './DataManager.js';
import {CryptographyEngine} from './CryptoEngine.js';
import {Sync} from './Sync.js';
import {WebDAVConfig} from './types/vault.js';
import {KDFAdapter} from './KDFAdapter.js';
import {configLocalStorage} from "./LocalStorage.js";

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
  masterPassword: MasterPassword
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
  private vaultManager: DataManager;
  private syncManager: Sync;
  private kdfManager: KDFAdapter;
  private initialized: boolean = false;
  private static instance: PasswordManager | null = null;

  private constructor() {
    this.vaultManager = new DataManager();
    this.kdfManager = new KDFAdapter();
    this.syncManager = new Sync(this.vaultManager);
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

  private async initializeLocal(masterPassword: MasterPassword, webdavConfig?: WebDAVConfig): Promise<void> {
    const kdfSalt = await CryptographyEngine.generateSalt();
    const kdfConfig = {
      ...DEFAULT_KDF_CONFIG,
      params: {
        ...DEFAULT_KDF_CONFIG.params,
        salt: kdfSalt
      }
    };
    const masterKeyResult = await this.kdfManager.deriveKey(masterPassword, kdfConfig);
    await this.vaultManager.updateSentinel(masterKeyResult.key);
    await this.vaultManager.setMasterKey(masterKeyResult.key);
    this.vaultManager.setUserProfile({});
    this.vaultManager.setKDFConfig(kdfConfig);
    await this.vaultManager.saveUserProfile()
    await this.vaultManager.saveVault();
    if (webdavConfig) {
      await this.vaultManager.setWebDAVConfig(webdavConfig);
      await this.vaultManager.saveUserProfile();
    }
  }

  private async initializeRemote(masterPassword: MasterPassword, webdavConfig: WebDAVConfig, remoteVault: Vault) {
    // Use remote vault's KDF configuration
    this.vaultManager.setKDFConfig(remoteVault.kdf);

    // Derive master key using remote vault's KDF config
    const remoteMasterKeyResult = await this.kdfManager.deriveKey(masterPassword, remoteVault.kdf);
    await this.vaultManager.updateSentinel(remoteMasterKeyResult.key)
    await this.vaultManager.setMasterKey(remoteMasterKeyResult.key);

    this.vaultManager.setVault(remoteVault);
    await this.vaultManager.setWebDAVConfig(webdavConfig);
    await this.vaultManager.saveVault();
    await this.vaultManager.saveUserProfile();
  }

  /**
   * Initialize the password manager
   * @param params Initialization parameters including config and master password
   */
  async initialize(params: InitializeParams): Promise<void> {
    if (this.initialized) {
      return;
    }

    const {config = {}, masterPassword} = params;

    try {
      // Configure storage
      const storageConfig = {
        basePath: config.storage?.basePath,
      };
      configLocalStorage(storageConfig)
      const isAlreadyInitialized = await this.isInitialized();
      if (isAlreadyInitialized) {
        this.initialized = true;
        return;
      }

      const complexity = this.checkPasswordComplexity(masterPassword);
      // Validate password strength
      if (!complexity.isAcceptable) {
        throw new Error(`Password is too weak. ${complexity.warning.join(' ')} ${complexity.suggestions.join(' ')}`);
      }
      // Handle WebDAV configuration if provided
      if (config.webdav && config.pullRemoteVault) {
        // Try to load remote vault if pullRemoteVault is true
        await this.syncManager.initializeStorage(config.webdav)
        const remoteVault = await this.syncManager.loadRemoteVault();
        if (!remoteVault) {
          await this.initializeLocal(masterPassword, config.webdav);
        } else {
          await this.initializeRemote(masterPassword, config.webdav, remoteVault);
        }
      } else {
        await this.initializeLocal(masterPassword, config.webdav);
      }
      this.initialized = true;
    } catch (error) {
      throw new Error(`Failed to initialize password manager: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Check if the password manager is initialized
   * This method can be called before initialization to check status
   * @returns True if both vault and user profile exist, false otherwise
   */
  async isInitialized(): Promise<boolean> {
    try {
      await this.vaultManager.loadVault();
      await this.vaultManager.loadUserProfile();
    } catch (error) {
      return false;
    }
    this.initialized = true;
    return true;
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
    try {
      await this.vaultManager.loadUserProfile();
      const authResult = await this.authenticateII(password);
      if (authResult.success) {
        await this.vaultManager.loadVault();
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

      // Prepare update data for DataManager
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
   * Update a template
   * @param templateId Template ID
   * @param updates Update content
   */
  async updateTemplate(
    templateId: string,
    updates: {
      name?: string;
      fields?: TemplateField[];
    }
  ): Promise<void> {
    this.ensureInitialized();

    if (!this.isUnlocked()) {
      throw new Error('Vault is locked. Please authenticate first.');
    }

    const vaultUpdates: any = {};

    if (updates.name !== undefined) {
      vaultUpdates.name = updates.name;
    }

    if (updates.fields !== undefined) {
      // Ensure all fields have IDs
      vaultUpdates.fields = updates.fields.map(field => ({
        ...field,
        id: field.id || crypto.randomUUID(),
        optional: !field.optional // Convert required to optional (opposite boolean)
      }));
    }

    await this.vaultManager.updateTemplate(templateId, vaultUpdates);
  }

  /**
   * Delete a template
   * @param templateId Template ID
   */
  async deleteTemplate(templateId: string): Promise<void> {
    this.ensureInitialized();

    if (!this.isUnlocked()) {
      throw new Error('Vault is locked. Please authenticate first.');
    }

    // Note: deleteTemplate is not implemented in DataManager
    // We'll need to implement it or remove this functionality
    // For now, we'll throw an error
    throw new Error('Template deletion not yet implemented');
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
   */
  async createLabel(name: string): Promise<string> {
    this.ensureInitialized();

    if (!this.isUnlocked()) {
      throw new Error('Vault is locked. Please authenticate first.');
    }

    return await this.vaultManager.createLabel(name);
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
      name: label.name
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
      name: label.name
    }));
  }

  // === SETTINGS MANAGEMENT ===
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
      await this.vaultManager.setWebDAVConfig(webdavConfig);
      await this.vaultManager.saveUserProfile();
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
      await this.vaultManager.setWebDAVConfig({
        url: '',
        username: '',
        password: '',
        path: '/password-note/vault.json'
      });
      await this.vaultManager.saveUserProfile();
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
    try {
      const vault = this.vaultManager.getVault();
      const result = await this.syncManager.pull(vault, password);

      // If vault was updated, load the merged vault into local vault manager
      if (result.success && result.vaultUpdated && result.mergedVault) {
        // Load the merged vault data
        this.vaultManager.setVault(result.mergedVault);

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
    try {
      return await this.vaultManager.getWebDAVConfig();
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
      await this.syncManager.initializeStorage();
    } catch (error) {
      // Silently ignore WebDAV initialization errors on startup
      console.warn('Failed to initialize WebDAV on unlock:', error);
    }
  }

  // === UTILITY METHODS ===
  /**
   * Reset all data (vault and user profile)
   * This will completely wipe all stored data and reset the password manager to initial state
   */
  async reset(): Promise<void> {
    try {
      await this.vaultManager.clearData();
      this.vaultManager.clearMasterKey();
      this.syncManager.destroy();
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

  /**
   * Export vault data as JSON
   * @returns Encrypted vault data as JSON string
   */
  async exportVault(): Promise<string> {
    this.ensureInitialized();

    if (!this.isUnlocked()) {
      throw new Error('Vault is locked. Please authenticate first.');
    }

    try {
      const vault = this.vaultManager.getVault();
      return JSON.stringify(vault, null, 2);
    } catch (error) {
      throw new Error(`Failed to export vault: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

}