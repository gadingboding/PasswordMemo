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
  UserProfile,
  Vault,
  VaultLabel, VaultRecord,
  VaultTemplate, WebDAVConfig
} from './types/index.js';
import {CryptographyEngine} from './CryptoEngine.js';
import {KDFAdapter} from './KDFAdapter.js';
import {LocalUserProfileFile, LocalVaultFile} from "./LocalStorage.js";

/**
 * Vault Manager class
 */
export class DataManager {
  vault: Vault;
  userProfile: UserProfile = {};
  private masterKey: BinaryData | null = null;
  kdfManager: KDFAdapter;

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
    this.kdfManager = new KDFAdapter();
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
   * Set vault data
   */
  setVault(vault: Vault): void {
    this.vault = vault;
  }

  /**
   * Set User Profile
   */
  setUserProfile(userProfile: UserProfile): void {
    this.userProfile = userProfile;
  }

  /**
   * Load vault data
   */
  async loadVault() {
    let vaultData = await LocalVaultFile.read();
    if (!vaultData) {
      throw new Error('No vault data found in storage');
    }
    this.vault = JSON.parse(vaultData);
  }

  async loadUserProfile() {
    let userProfileData = await LocalUserProfileFile.read();
    if (!userProfileData) {
      throw new Error('No vault data found in storage');
    }
    this.userProfile = JSON.parse(userProfileData);
  }

  /**
   * Save vault data to storage
   */
  async saveVault(): Promise<void> {
    try {
      await LocalVaultFile.write(JSON.stringify(this.vault));
    } catch (error) {
      throw new Error(`Failed to save vault data: ${error}`);
    }
  }

  /**
   * Save User Profile to storage
   */
  async saveUserProfile(): Promise<void> {
    try {
      await LocalUserProfileFile.write(JSON.stringify(this.userProfile));
    } catch (error) {
      throw new Error(`Failed to save User Profile: ${error}`);
    }
  }

  /**
   * Load vault data from storage
   */
  async loadVaultFromStorage(): Promise<boolean> {
    try {
      const vaultData = await LocalVaultFile.read();
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
      encryptedFields[fieldId] = await CryptographyEngine.encrypt(value, this.masterKey);
    }

    this.vault.records[recordId] = {
      last_modified: now,
      deleted: false,
      local_only: false,
      template: templateId,
      labels: [...labels],
      title: encryptedTitle,
      fields: encryptedFields,
    };

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
      try {
        const templateJson = await CryptographyEngine.decryptToString(templateData, this.masterKey);
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
      record.title = await CryptographyEngine.encrypt(updates.title, this.masterKey);
    }

    // Update fields if provided
    if (updates.fields !== undefined) {
      const encryptedFields: Record<string, EncryptedData> = {};
      for (const [fieldId, value] of Object.entries(updates.fields)) {
        encryptedFields[fieldId] = await CryptographyEngine.encrypt(value, this.masterKey);
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

    this.vault.templates[templateId] = await CryptographyEngine.encrypt(
      JSON.stringify(template),
      this.masterKey
    );

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
    const templateJson = await CryptographyEngine.decryptToString(encryptedTemplate, this.masterKey);
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
      try {
        const templateJson = await CryptographyEngine.decryptToString(encryptedTemplate, this.masterKey);
        const template: VaultTemplate = JSON.parse(templateJson);

        templates.push({
          id: templateId,
          name: template.name,
          fieldCount: template.fields.length,
        });
      } catch (error) {
        // Skip this template and continue with others
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
    const templateJson = await CryptographyEngine.decryptToString(encryptedTemplate, this.masterKey);
    const template: VaultTemplate = JSON.parse(templateJson);

    if (updates.name !== undefined) {
      template.name = updates.name;
    }

    if (updates.fields !== undefined) {
      template.fields = updates.fields;
    }

    this.vault.templates[templateId] = await CryptographyEngine.encrypt(
      JSON.stringify(template),
      this.masterKey
    );
    await this.saveVault();
  }

  /**
   * Delete a template
   */
  async deleteTemplate(templateId: string): Promise<void> {
    if (!this.masterKey) {
      throw new Error('Vault is locked. Master key required.');
    }

    // Check if template exists
    const encryptedTemplate = this.vault.templates[templateId];
    if (!encryptedTemplate) {
      throw new Error('Template not found');
    }

    // Check if template is being used by any records
    const isTemplateInUse = await this.isTemplateInUse(templateId);
    if (isTemplateInUse) {
      throw new Error('Cannot delete template: it is being used by one or more records');
    }

    // Delete the template
    delete this.vault.templates[templateId];

    // Save vault data after modification
    await this.saveVault();
  }

  /**
   * Check if a template is being used by any records
   */
  async isTemplateInUse(templateId: string): Promise<boolean> {
    // Check all records to see if any use this template
    for (const record of Object.values(this.vault.records)) {
      if (!record.deleted && record.template === templateId) {
        return true;
      }
    }
    return false;
  }

  // === LABEL MANAGEMENT ===

  /**
   * Create a new label
   */
  async createLabel(name: string): Promise<string> {
    if (!this.masterKey) {
      throw new Error('Vault is locked. Master key required.');
    }

    const labelId = uuidv4();
    const label: VaultLabel = {name};

    this.vault.labels[labelId] = await CryptographyEngine.encrypt(
      JSON.stringify(label),
      this.masterKey
    );

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
  } | null> {
    if (!this.masterKey) {
      throw new Error('Vault is locked. Master key required.');
    }

    const encryptedLabel = this.vault.labels[labelId];
    if (!encryptedLabel) {
      return null;
    }

    const labelJson = await CryptographyEngine.decryptToString(encryptedLabel, this.masterKey);
    const label: VaultLabel = JSON.parse(labelJson);
    return {
      id: labelId,
      name: label.name,
    };
  }

  /**
   * Get all labels
   */
  async getLabelList(): Promise<Array<{
    id: string;
    name: string;
  }>> {
    if (!this.masterKey) {
      throw new Error('Vault is locked. Master key required.');
    }

    const labels = [];
    for (const [labelId, encryptedLabel] of Object.entries(this.vault.labels)) {
      const labelJson = await CryptographyEngine.decryptToString(encryptedLabel, this.masterKey);
      const label: VaultLabel = JSON.parse(labelJson);

      labels.push({
        id: labelId,
        name: label.name,
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
    updates: { name?: string }
  ): Promise<void> {
    if (!this.masterKey) {
      throw new Error('Vault is locked. Master key required.');
    }

    const encryptedLabel = this.vault.labels[labelId];
    if (!encryptedLabel) {
      throw new Error('Label not found');
    }

    const labelJson = await CryptographyEngine.decryptToString(encryptedLabel, this.masterKey);
    const label: VaultLabel = JSON.parse(labelJson);

    if (updates.name !== undefined) {
      label.name = updates.name;
    }

    this.vault.labels[labelId] = await CryptographyEngine.encrypt(
      JSON.stringify(label),
      this.masterKey
    );
    await this.saveVault();
  }

  /**
   * Update KDF configuration and re-encrypt all data
   * @returns true if KDF configuration was updated, false if no update was needed
   */
  async updateKDFConfig(newConfig: KDFConfig, password: string): Promise<boolean> {
    const currentConfig = this.getKDFConfig();
    if (currentConfig && this.kdfManager.areConfigsCompatible(currentConfig, newConfig)) {
      return false;
    }
    let currentMasterKey = this.masterKey!;
    let newMasterKey = (await this.kdfManager.deriveKey(password, newConfig)).key;

    try {
      this.setKDFConfig(newConfig);
      await this.reEncryptAllDataWithNewKey(currentMasterKey, newMasterKey);
      await this.reEncryptWebDAVConfig(currentMasterKey, newMasterKey);
      await this.updateSentinel(newMasterKey);
      await this.setMasterKey(newMasterKey);
      await this.saveVault();
      await this.saveUserProfile();
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
    try {
      // Check if WebDAV configuration exists
      if (!this.userProfile.webdav_config) {
        // No WebDAV configuration to re-encrypt
        return;
      }

      // Decrypt WebDAV configuration with old master key
      const encryptedData = this.userProfile.webdav_config.encrypted_data;
      const decryptedConfigJson = await CryptographyEngine.decryptToString(encryptedData, oldMasterKey);

      // Re-encrypt WebDAV configuration with new master key
      this.userProfile.webdav_config.encrypted_data = await CryptographyEngine.encrypt(decryptedConfigJson, newMasterKey);
    } catch (error) {
      throw new Error(`Failed to re-encrypt WebDAV configuration: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Re-encrypt all vault data with new master key by decrypting and re-encrypting each field
   * This method directly operates on the vault data without storing all decrypted data in memory
   */
  private async reEncryptAllDataWithNewKey(oldMasterKey: BinaryData, newMasterKey: BinaryData): Promise<void> {
    let records: Record<string, VaultRecord> = {}
    for (const [recordId, record] of Object.entries(this.vault.records)) {
      // Decrypt and re-encrypt title
      const decryptedTitle = await CryptographyEngine.decryptToString(record.title, oldMasterKey);
      const encryptedTitle = await CryptographyEngine.encrypt(decryptedTitle, newMasterKey);

      // Decrypt and re-encrypt fields
      const encryptedFields: Record<string, EncryptedData> = {};
      for (const [fieldId, encryptedField] of Object.entries(record.fields)) {
        const decryptedFieldValue = await CryptographyEngine.decryptToString(encryptedField, oldMasterKey);
        encryptedFields[fieldId] = await CryptographyEngine.encrypt(decryptedFieldValue, newMasterKey);
      }

      // Update record with re-encrypted data
      records[recordId] = {
        ...record,
        title: encryptedTitle,
        fields: encryptedFields
      };
    }
    this.vault.records = records;

    let labels: Record<string, EncryptedData> = {};
    for (const [labelId, encryptedLabel] of Object.entries(this.vault.labels)) {
      const decryptedLabelJson = await CryptographyEngine.decryptToString(encryptedLabel, oldMasterKey);
      labels[labelId] = await CryptographyEngine.encrypt(decryptedLabelJson, newMasterKey);
    }
    this.vault.labels = labels;


    let templates: Record<string, EncryptedData> = {};
    for (const [templateId, encryptedTemplate] of Object.entries(this.vault.templates)) {
      const decryptedTemplateJson = await CryptographyEngine.decryptToString(encryptedTemplate, oldMasterKey);
      templates[templateId] = await CryptographyEngine.encrypt(decryptedTemplateJson, newMasterKey);
    }
    this.vault.templates = templates;
  }

  async clearData() {
    this.vault = {
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
    }
    this.userProfile = {}
    await LocalVaultFile.remove()
    await LocalUserProfileFile.remove()
  }

  async getWebDAVConfig(): Promise<WebDAVConfig | null> {
    try {
      const encryptedData = this.userProfile.webdav_config?.encrypted_data!;
      const decryptedData = await CryptographyEngine.decryptToString(encryptedData, this.masterKey!);
      return JSON.parse(decryptedData) as WebDAVConfig;
    } catch (error) {
      return null;
    }
  }

  /**
   * Save WebDAV configuration (encrypted)
   */
  async setWebDAVConfig(config: WebDAVConfig): Promise<void> {
    try {
      const configJson = JSON.stringify(config);
      const encryptedData = await CryptographyEngine.encrypt(configJson, this.masterKey!);
      this.userProfile.webdav_config = {encrypted_data: encryptedData};
    } catch (error) {
      throw new Error('Failed to save WebDAV configuration');
    }
  }
}