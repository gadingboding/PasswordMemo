/**
 * Vault Manager
 *
 * Manages the password vault including records, templates, and labels.
 * Handles encryption/decryption of sensitive data and provides CRUD operations.
 */

import {v4 as uuidv4} from 'uuid';
import {
  BinaryData,
  DecryptedRecordField,
  DecryptedVaultRecord,
  DEFAULT_KDF_CONFIG,
  EncryptedData,
  KDFConfig,
  TemplateField,
  Vault,
  VaultLabel,
  VaultRecord,
  VaultTemplate
} from './types/index.js';
import {CryptographyEngine} from './crypto-engine.js';
import {EnvironmentManager, IStorageAdapter} from './environment-manager.js';
import {KDFManager} from './kdf-manager.js';
import {STORAGE_KEYS} from './constants.js';

/**
 * Vault Manager class
 */
export class VaultManager {
  private vault: Vault;
  private masterKey: BinaryData | null = null;
  environmentManager: EnvironmentManager;
  kdfManager: KDFManager;

  constructor(vault?: Vault) {
    this.vault = vault || {
      records: {},
      labels: {},
      templates: {},
      history: [],
      kdf: {
        ...DEFAULT_KDF_CONFIG,
        params: {
          ...DEFAULT_KDF_CONFIG.params,
          salt: ''
        }
      }
    };
    this.environmentManager = EnvironmentManager.getInstance();
    this.kdfManager = new KDFManager();
  }

  /**
   * Get the storage adapter
   * @private
   */
  private get storage(): IStorageAdapter {
    return this.environmentManager.getStorage();
  }

  /**
   * Set the master key for encryption/decryption
   */
  async setMasterKey(masterKey: BinaryData): Promise<void> {
    this.masterKey = masterKey;
    if (!this.vault.sentinel) {
      throw new Error('Vault sentinel is missing. Cannot validate master key.');
    }
    let result = await this.validateMasterKey()
    if (!result.success) {
      this.masterKey = null;
      throw new Error(`Invalid master key: ${result.error}`);
    }
  }

  /**
   * Clear the master key from memory
   */
  clearMasterKey(): void {
    this.masterKey = null;
  }

  /**
   * Check if master key is available
   */
  isUnlocked(): boolean {
    return this.masterKey !== null;
  }

  /**
   * Get the current master key
   */
  getMasterKey(): BinaryData | null {
    return this.masterKey;
  }

  /**
   * Get the KDF configuration
   */
  getKDFConfig(): KDFConfig | null {
    return this.vault.kdf || null;
  }

  /**
   * Set the KDF configuration
   */
  setKDFConfig(kdfConfig: KDFConfig): void {
    this.vault.kdf = kdfConfig;
  }

  /**
   * Validate master key using sentinel password
   */
  async validateMasterKey(): Promise<{ success: boolean; error?: string }> {
    if (!this.masterKey) {
      return {success: false, error: 'Master key not available'};
    }

    const validationResult = await CryptographyEngine.validateMasterKey(
      this.vault.sentinel!,
      this.masterKey
    );

    return {
      success: validationResult.success,
      error: validationResult.error
    };
  }

  /**
   * Validate provided password against sentinel
   * @param password Password to validate
   * @returns Validation result
   */
  async validatePassword(password: string): Promise<{ success: boolean; error?: string }> {
    if (!this.vault.kdf) {
      return {success: false, error: 'KDF configuration not available'};
    }

    try {
      // Derive a key from the provided password
      const tempKeyResult = await this.kdfManager.deriveKey(password, this.vault.kdf);

      // Validate the derived key against the sentinel
      const validationResult = await CryptographyEngine.validateMasterKey(
        this.vault.sentinel!,
        tempKeyResult.key
      );

      return {
        success: validationResult.success,
        error: validationResult.error
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Update sentinel when master key changes
   */
  async updateSentinel(newMasterKey: BinaryData): Promise<void> {
    this.vault.sentinel = await CryptographyEngine.createSentinel(newMasterKey);
  }

  /**
   * Get the current vault data
   */
  getVault(): Vault {
    return this.vault;
  }

  /**
   * Load vault data
   */
  loadVault(vault: Vault): void {
    this.vault = vault;
  }

  /**
   * Save vault data to storage
   */
  async saveVault(): Promise<void> {
    try {
      await this.storage.write(STORAGE_KEYS.VAULT_DATA, JSON.stringify(this.vault));
    } catch (error) {
      throw new Error(`Failed to save vault data: ${error}`);
    }
  }

  /**
   * Load vault data from storage
   */
  async loadVaultFromStorage(): Promise<boolean> {
    try {
      const vaultData = await this.storage.read(STORAGE_KEYS.VAULT_DATA);
      if (vaultData) {
        this.vault = JSON.parse(vaultData);
        return true;
      }
      return false;
    } catch (error) {
      return false;
    }
  }

  // === RECORD MANAGEMENT ===

  /**
   * Create a new record
   */
  async createRecord(
    templateId: string,
    title: string,
    fields: Record<string, string>,
    labels: string[] = []
  ): Promise<string> {
    if (!this.masterKey) {
      throw new Error('Vault is locked. Master key required.');
    }

    const recordId = uuidv4();
    const now = new Date().toISOString();

    // Encrypt title and fields
    const encryptedTitle = await CryptographyEngine.encrypt(title, this.masterKey);
    const encryptedFields: Record<string, EncryptedData> = {};

    for (const [fieldId, value] of Object.entries(fields)) {
      const encrypted = await CryptographyEngine.encrypt(value, this.masterKey);
      encryptedFields[fieldId] = encrypted;
    }

    const record: VaultRecord = {
      last_modified: now,
      deleted: false,
      local_only: false,
      template: templateId,
      labels: [...labels],
      title: encryptedTitle,
      fields: encryptedFields,
    };

    this.vault.records[recordId] = record;

    // Save vault data after modification
    await this.saveVault();

    return recordId;
  }

  /**
   * Get a record by ID (decrypted)
   */
  async getRecord(recordId: string): Promise<DecryptedVaultRecord | null> {
    if (!this.masterKey) {
      throw new Error('Vault is locked. Master key required.');
    }

    const record = this.vault.records[recordId];
    if (!record || record.deleted) {
      return null;
    }

    // Decrypt title
    const titleData = record.title;
    const title = await CryptographyEngine.decryptToString(titleData, this.masterKey);

    // Get template to retrieve field definitions
    const templateData = this.vault.templates[record.template];
    let templateFields: TemplateField[] = [];

    if (templateData) {
      // 检查 templateData 是否已经是 EncryptedData 对象
      let encryptedTemplate: EncryptedData;
      if (typeof templateData === 'string') {
        // 如果是字符串，尝试解析为 JSON
        try {
          encryptedTemplate = JSON.parse(templateData);
        } catch (parseError) {
          return null;
        }
      } else {
        // 如果已经是对象，直接使用
        encryptedTemplate = templateData as EncryptedData;
      }

      try {
        const templateJson = await CryptographyEngine.decryptToString(encryptedTemplate, this.masterKey);
        const template: VaultTemplate = JSON.parse(templateJson);
        templateFields = template.fields;
      } catch (error) {
        return null;
      }
    }

    // Decrypt fields and enrich with field definitions
    const fields: Array<DecryptedRecordField> = [];

    for (const [fieldId, encryptedValue] of Object.entries(record.fields)) {
      const fieldValue = await CryptographyEngine.decryptToString(encryptedValue, this.masterKey);

      // Find field definition in template
      const fieldDefinition = templateFields.find(field => field.id === fieldId);

      fields.push({
        id: fieldId,
        name: fieldDefinition?.name || fieldId, // Fallback to field ID if name not found
        type: fieldDefinition?.type || 'text', // Default to 'text' if type not found
        value: fieldValue
      } as DecryptedRecordField);
    }

    return {
      id: recordId,
      title,
      fields,
      template: record.template,
      labels: record.labels,
      last_modified: record.last_modified,
      deleted: record.deleted,
      local_only: record.local_only,
    } as DecryptedVaultRecord;
  }

  /**
   * Update a record
   */
  async updateRecord(
    recordId: string,
    updates: {
      title?: string;
      fields?: Record<string, string>;
      labels?: string[];
    }
  ): Promise<void> {
    if (!this.masterKey) {
      throw new Error('Vault is locked. Master key required.');
    }

    const record = this.vault.records[recordId];
    if (!record || record.deleted) {
      throw new Error('Record not found');
    }

    const now = new Date().toISOString();

    // Update title if provided
    if (updates.title !== undefined) {
      const encryptedTitle = await CryptographyEngine.encrypt(updates.title, this.masterKey);
      record.title = encryptedTitle;
    }

    // Update fields if provided
    if (updates.fields !== undefined) {
      const encryptedFields: Record<string, EncryptedData> = {};
      for (const [fieldId, value] of Object.entries(updates.fields)) {
        const encrypted = await CryptographyEngine.encrypt(value, this.masterKey);
        encryptedFields[fieldId] = encrypted;
      }
      record.fields = encryptedFields;
    }

    // Update labels if provided
    if (updates.labels !== undefined) {
      record.labels = [...updates.labels];
    }

    record.last_modified = now;

    // Save vault data after modification
    await this.saveVault();
  }

  /**
   * Delete a record (mark as deleted)
   */
  async deleteRecord(recordId: string): Promise<void> {
    const record = this.vault.records[recordId];
    if (!record) {
      throw new Error('Record not found');
    }

    record.deleted = true;
    record.last_modified = new Date().toISOString();

    // Save vault data after modification
    await this.saveVault();
  }

  /**
   * Get all records (decrypted titles only for listing)
   */
  async getRecordList(): Promise<Array<{
    id: string;
    title: string;
    template: string;
    labels: string[];
    last_modified: string;
  }>> {
    if (!this.masterKey) {
      throw new Error('Vault is locked. Master key required.');
    }

    const records = [];
    for (const [recordId, record] of Object.entries(this.vault.records)) {
      if (record.deleted) continue;

      // Decrypt title
      const title = await CryptographyEngine.decryptToString(record.title, this.masterKey);

      records.push({
        id: recordId,
        title,
        template: record.template,
        labels: record.labels,
        last_modified: record.last_modified,
      });
    }

    return records.sort((a, b) => b.last_modified.localeCompare(a.last_modified));
  }

  // === TEMPLATE MANAGEMENT ===

  /**
   * Create a new template
   */
  async createTemplate(name: string, fields: TemplateField[]): Promise<string> {
    if (!this.masterKey) {
      throw new Error('Vault is locked. Master key required.');
    }

    const templateId = uuidv4();
    const template: VaultTemplate = {
      name,
      fields: fields.map(field => ({
        ...field,
        id: field.id || uuidv4(),
      })),
    };

    const encryptedTemplate = await CryptographyEngine.encrypt(
      JSON.stringify(template),
      this.masterKey
    );

    this.vault.templates[templateId] = encryptedTemplate;

    // Save vault data after modification
    await this.saveVault();

    return templateId;
  }

  /**
   * Get a template by ID (decrypted)
   */
  async getTemplate(templateId: string): Promise<{
    id: string;
    name: string;
    fields: TemplateField[];
  } | null> {
    if (!this.masterKey) {
      throw new Error('Vault is locked. Master key required.');
    }

    const encryptedTemplate = this.vault.templates[templateId];
    if (!encryptedTemplate) {
      return null;
    }

    // 检查 encryptedTemplate 是否已经是 EncryptedData 对象
    let templateData: EncryptedData;
    if (typeof encryptedTemplate === 'string') {
      // 如果是字符串，尝试解析为 JSON
      templateData = JSON.parse(encryptedTemplate);
    } else {
      // 如果已经是对象，直接使用
      templateData = encryptedTemplate as EncryptedData;
    }

    const templateJson = await CryptographyEngine.decryptToString(templateData, this.masterKey);
    const template: VaultTemplate = JSON.parse(templateJson);

    return {
      id: templateId,
      name: template.name,
      fields: template.fields,
    };
  }

  /**
   * Get all templates
   */
  async getTemplateList(): Promise<Array<{
    id: string;
    name: string;
    fieldCount: number;
  }>> {
    if (!this.masterKey) {
      throw new Error('Vault is locked. Master key required.');
    }

    const templates = [];
    for (const [templateId, encryptedTemplate] of Object.entries(this.vault.templates)) {
      // 检查 encryptedTemplate 是否已经是 EncryptedData 对象
      let templateData: EncryptedData;
      if (typeof encryptedTemplate === 'string') {
        // 如果是字符串，尝试解析为 JSON
        try {
          templateData = JSON.parse(encryptedTemplate);
        } catch (parseError) {
          continue; // Skip this template and continue with others
        }
      } else {
        // 如果已经是对象，直接使用
        templateData = encryptedTemplate as EncryptedData;
      }

      try {
        const templateJson = await CryptographyEngine.decryptToString(templateData, this.masterKey);
        const template: VaultTemplate = JSON.parse(templateJson);

        templates.push({
          id: templateId,
          name: template.name,
          fieldCount: template.fields.length,
        });
      } catch (error) {
        continue; // Skip this template and continue with others
      }
    }

    return templates.sort((a, b) => a.name.localeCompare(b.name));
  }

  /**
   * Update a template
   */
  async updateTemplate(
    templateId: string,
    updates: { name?: string; fields?: TemplateField[] }
  ): Promise<void> {
    if (!this.masterKey) {
      throw new Error('Vault is locked. Master key required.');
    }

    const encryptedTemplate = this.vault.templates[templateId];
    if (!encryptedTemplate) {
      throw new Error('Template not found');
    }

    // 检查 encryptedTemplate 是否已经是 EncryptedData 对象
    let templateData: EncryptedData;
    if (typeof encryptedTemplate === 'string') {
      // 如果是字符串，尝试解析为 JSON
      templateData = JSON.parse(encryptedTemplate);
    } else {
      // 如果已经是对象，直接使用
      templateData = encryptedTemplate as EncryptedData;
    }

    const templateJson = await CryptographyEngine.decryptToString(templateData, this.masterKey);
    const template: VaultTemplate = JSON.parse(templateJson);

    if (updates.name !== undefined) {
      template.name = updates.name;
    }

    if (updates.fields !== undefined) {
      template.fields = updates.fields;
    }

    const newEncryptedTemplate = await CryptographyEngine.encrypt(
      JSON.stringify(template),
      this.masterKey
    );

    this.vault.templates[templateId] = newEncryptedTemplate;
    await this.saveVault();
  }

  // === LABEL MANAGEMENT ===

  /**
   * Create a new label
   */
  async createLabel(name: string, color: string): Promise<string> {
    if (!this.masterKey) {
      throw new Error('Vault is locked. Master key required.');
    }

    const labelId = uuidv4();
    const label: VaultLabel = {name, color};

    const encryptedLabel = await CryptographyEngine.encrypt(
      JSON.stringify(label),
      this.masterKey
    );

    this.vault.labels[labelId] = encryptedLabel;

    // Save vault data after modification
    await this.saveVault();

    return labelId;
  }

  /**
   * Get a label by ID (decrypted)
   */
  async getLabel(labelId: string): Promise<{
    id: string;
    name: string;
    color: string;
  } | null> {
    if (!this.masterKey) {
      throw new Error('Vault is locked. Master key required.');
    }

    const encryptedLabel = this.vault.labels[labelId];
    if (!encryptedLabel) {
      return null;
    }

    // 检查 encryptedLabel 是否已经是 EncryptedData 对象
    let labelData: EncryptedData;
    if (typeof encryptedLabel === 'string') {
      // 如果是字符串，尝试解析为 JSON
      labelData = JSON.parse(encryptedLabel);
    } else {
      // 如果已经是对象，直接使用
      labelData = encryptedLabel as EncryptedData;
    }

    const labelJson = await CryptographyEngine.decryptToString(labelData, this.masterKey);
    const label: VaultLabel = JSON.parse(labelJson);

    return {
      id: labelId,
      name: label.name,
      color: label.color,
    };
  }

  /**
   * Get all labels
   */
  async getLabelList(): Promise<Array<{
    id: string;
    name: string;
    color: string;
  }>> {
    if (!this.masterKey) {
      throw new Error('Vault is locked. Master key required.');
    }

    const labels = [];
    for (const [labelId, encryptedLabel] of Object.entries(this.vault.labels)) {
      // 检查 encryptedLabel 是否已经是 EncryptedData 对象
      let labelData: EncryptedData;
      if (typeof encryptedLabel === 'string') {
        // 如果是字符串，尝试解析为 JSON
        labelData = JSON.parse(encryptedLabel);
      } else {
        // 如果已经是对象，直接使用
        labelData = encryptedLabel as EncryptedData;
      }

      const labelJson = await CryptographyEngine.decryptToString(labelData, this.masterKey);
      const label: VaultLabel = JSON.parse(labelJson);

      labels.push({
        id: labelId,
        name: label.name,
        color: label.color,
      });
    }

    return labels.sort((a, b) => a.name.localeCompare(b.name));
  }

  /**
   * Delete a label
   */
  async deleteLabel(labelId: string): Promise<void> {
    delete this.vault.labels[labelId];

    // Remove label from all records
    for (const record of Object.values(this.vault.records)) {
      const index = record.labels.indexOf(labelId);
      if (index > -1) {
        record.labels.splice(index, 1);
        record.last_modified = new Date().toISOString();
      }
    }

    // Save vault data after modification
    await this.saveVault();
  }

  /**
   * Update a label
   */
  async updateLabel(
    labelId: string,
    updates: { name?: string; color?: string }
  ): Promise<void> {
    if (!this.masterKey) {
      throw new Error('Vault is locked. Master key required.');
    }

    const encryptedLabel = this.vault.labels[labelId];
    if (!encryptedLabel) {
      throw new Error('Label not found');
    }

    // 检查 encryptedLabel 是否已经是 EncryptedData 对象
    let labelData: EncryptedData;
    if (typeof encryptedLabel === 'string') {
      // 如果是字符串，尝试解析为 JSON
      labelData = JSON.parse(encryptedLabel);
    } else {
      // 如果已经是对象，直接使用
      labelData = encryptedLabel as EncryptedData;
    }

    const labelJson = await CryptographyEngine.decryptToString(labelData, this.masterKey);
    const label: VaultLabel = JSON.parse(labelJson);

    if (updates.name !== undefined) {
      label.name = updates.name;
    }

    if (updates.color !== undefined) {
      label.color = updates.color;
    }

    const newEncryptedLabel = await CryptographyEngine.encrypt(
      JSON.stringify(label),
      this.masterKey
    );

    this.vault.labels[labelId] = newEncryptedLabel;
    await this.saveVault();
  }

  /**
   * Update KDF configuration and re-encrypt all data
   * @returns true if KDF configuration was updated, false if no update was needed
   */
  async updateKDFConfig(newConfig: KDFConfig, password: string): Promise<boolean> {
    if (!this.isUnlocked()) {
      throw new Error('Vault must be unlocked to update KDF configuration');
    }

    // Validate new KDF configuration
    const validation = this.kdfManager.validateConfig(newConfig);
    if (!validation.valid) {
      throw new Error(`Invalid KDF configuration: ${validation.errors?.join(', ')}`);
    }

    const currentMasterKey = this.getMasterKey();
    if (!currentMasterKey) {
      throw new Error('Master key not available');
    }

    // Check if KDF configurations are the same
    const currentConfig = this.getKDFConfig();
    if (currentConfig && JSON.stringify(currentConfig) === JSON.stringify(newConfig)) {
      // Configurations are the same, no need to update
      return false;
    }

    try {
      // Step 1: Decrypt all existing data with current master key
      const decryptedData = await this.decryptAllData(currentMasterKey);

      // Step 2: Update KDF configuration in vault
      this.setKDFConfig(newConfig);

      // Step 3: Generate new master key with new KDF configuration and password
      const newMasterKeyResult = await this.kdfManager.deriveKey(password, newConfig);
      const newMasterKey = newMasterKeyResult.key;

      // Step 4: Re-encrypt all data with new master key
      await this.reEncryptAllData(decryptedData, newMasterKey);
      await this.reEncryptWebDAVConfig(currentMasterKey, newMasterKey);

      // Step 5: Update sentinel password with new master key
      await this.updateSentinel(newMasterKey);

      // Step 6: Update current master key
      await this.setMasterKey(newMasterKey);

      // Step 7: Save vault with new configuration and re-encrypted data
      await this.saveVault();

      return true; // KDF configuration was updated

    } catch (error) {
      throw new Error(`Failed to update KDF configuration: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Re-encrypt WebDAV configuration in user profile with new master key
   * This method should be called when the master key changes
   * @param oldMasterKey The old master key used for current encryption
   * @param newMasterKey The new master key to use for re-encryption
   */
  async reEncryptWebDAVConfig(oldMasterKey: BinaryData, newMasterKey: BinaryData): Promise<void> {
    // Import ConfigurationManager to access user profile
    const {ConfigurationManager} = await import('./configuration-manager.js');
    const configManager = new ConfigurationManager();
    
    try {
      // Load current user profile
      const userProfile = await configManager.loadUserProfile();
      if (!userProfile || !userProfile.webdav_config) {
        // No WebDAV configuration to re-encrypt
        return;
      }

      // Decrypt WebDAV configuration with old master key
      const encryptedData = userProfile.webdav_config.encrypted_data;
      const decryptedConfigJson = await CryptographyEngine.decryptToString(encryptedData, oldMasterKey);
      
      // Re-encrypt WebDAV configuration with new master key
      userProfile.webdav_config.encrypted_data = await CryptographyEngine.encrypt(decryptedConfigJson, newMasterKey);
      await configManager.saveUserProfile(userProfile);
    } catch (error) {
      throw new Error(`Failed to re-encrypt WebDAV configuration: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Decrypt all vault data
   */
  private async decryptAllData(masterKey: BinaryData): Promise<{
    records: Record<string, any>;
    labels: Record<string, any>;
    templates: Record<string, any>;
  }> {
    const decryptedData: {
      records: Record<string, any>;
      labels: Record<string, any>;
      templates: Record<string, any>;
    } = {
      records: {},
      labels: {},
      templates: {}
    };

    // Decrypt all records
    for (const [recordId, record] of Object.entries(this.vault.records)) {
      const decryptedRecord = {
        ...record,
        title: await CryptographyEngine.decryptToString(record.title, masterKey),
        fields: {} as Record<string, string>
      };

      for (const [fieldId, encryptedField] of Object.entries(record.fields)) {
        decryptedRecord.fields[fieldId] = await CryptographyEngine.decryptToString(encryptedField, masterKey);
      }

      decryptedData.records[recordId] = decryptedRecord;
    }

    // Decrypt all labels
    for (const [labelId, encryptedLabel] of Object.entries(this.vault.labels)) {
      let labelData: EncryptedData;
      if (typeof encryptedLabel === 'string') {
        labelData = JSON.parse(encryptedLabel);
      } else {
        labelData = encryptedLabel as EncryptedData;
      }

      const labelJson = await CryptographyEngine.decryptToString(labelData, masterKey);
      decryptedData.labels[labelId] = JSON.parse(labelJson);
    }

    // Decrypt all templates
    for (const [templateId, encryptedTemplate] of Object.entries(this.vault.templates)) {
      let templateData: EncryptedData;
      if (typeof encryptedTemplate === 'string') {
        templateData = JSON.parse(encryptedTemplate);
      } else {
        templateData = encryptedTemplate as EncryptedData;
      }

      const templateJson = await CryptographyEngine.decryptToString(templateData, masterKey);
      decryptedData.templates[templateId] = JSON.parse(templateJson);
    }

    return decryptedData;
  }

  /**
   * Re-encrypt all vault data with new master key
   */
  private async reEncryptAllData(
    decryptedData: {
      records: Record<string, any>;
      labels: Record<string, any>;
      templates: Record<string, any>;
    },
    newMasterKey: BinaryData
  ): Promise<void> {
    // Re-encrypt all records
    for (const [recordId, decryptedRecord] of Object.entries(decryptedData.records)) {
      const encryptedTitle = await CryptographyEngine.encrypt(decryptedRecord.title, newMasterKey);
      const encryptedFields: Record<string, EncryptedData> = {};

      for (const [fieldId, fieldValue] of Object.entries(decryptedRecord.fields)) {
        encryptedFields[fieldId] = await CryptographyEngine.encrypt(fieldValue as string, newMasterKey);
      }

      this.vault.records[recordId] = {
        ...decryptedRecord,
        title: encryptedTitle,
        fields: encryptedFields
      };
    }

    // Re-encrypt all labels
    for (const [labelId, decryptedLabel] of Object.entries(decryptedData.labels)) {
      this.vault.labels[labelId] = await CryptographyEngine.encrypt(JSON.stringify(decryptedLabel), newMasterKey);
    }

    // Re-encrypt all templates
    for (const [templateId, decryptedTemplate] of Object.entries(decryptedData.templates)) {
      this.vault.templates[templateId] = await CryptographyEngine.encrypt(JSON.stringify(decryptedTemplate), newMasterKey);
    }
  }
}