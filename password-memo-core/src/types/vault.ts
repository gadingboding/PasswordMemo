/**
 * Core Vault Data Structures
 *
 * These types define the structure of the password manager's data model
 * as specified in the design document.
 */
import {EncryptedData} from './crypto.js';
import {KDFConfig} from './kdf.js';

/**
 * Base interface for all records that support synchronization
 */
export interface SyncableRecord {
  /** UTC ISO 8601 timestamp of last modification */
  last_modified: string;
  /** Whether this record has been deleted (tombstone) */
  deleted: boolean;
  /** Whether this record should only exist locally and not sync */
  local_only: boolean;
}

export interface DecryptedVaultRecord {
  id: string;
  title: string;
  fields: Array<DecryptedRecordField>;
  template: string;
  labels: string[];
  last_modified: string;
  deleted: boolean;
  local_only: boolean;
}

export interface DecryptedRecordField {
  id: string;
  name: string;
  type: 'text' | 'password' | 'email' | 'url' | 'number' | 'textarea';
  value: string;
}

/**
 * A password record in the vault
 */
export interface VaultRecord extends SyncableRecord {
  /** UUID of the template this record uses */
  template: string;
  /** Array of label UUIDs associated with this record */
  labels: string[];
  /** Encrypted title of the record */
  title: EncryptedData;
  /** Map of field UUID to encrypted field value */
  fields: Record<string, EncryptedData>;
}

/**
 * A label for organizing records
 */
export interface VaultLabel {
  /** Display name of the label */
  name: string;
}

/**
 * Field definition within a template
 */
export interface TemplateField {
  /** UUID of the field */
  id: string;
  /** Display name of the field */
  name: string;
  /** Type of the field (text, password, email, etc.) */
  type: 'text' | 'password' | 'email' | 'url' | 'number' | 'textarea';
  /** Whether this field is optional */
  optional: boolean;
}

/**
 * Template definition for creating structured records
 */
export interface VaultTemplate {
  /** Display name of the template */
  name: string;
  /** Array of field definitions */
  fields: TemplateField[];
}

/**
 * Main vault data structure
 */
export interface Vault {
  /** Map of record UUID to VaultRecord */
  records: Record<string, VaultRecord>;
  /** Map of label UUID to encrypted VaultLabel */
  labels: Record<string, EncryptedData>;
  /** Map of template UUID to encrypted VaultTemplate */
  templates: Record<string, EncryptedData>;
  /** History of sync version IDs */
  history: string[];
  /** KDF configuration for master key derivation */
  kdf: KDFConfig;
  /** Sentinel password configuration for master key validation */
  sentinel?: EncryptedData;
}

/**
 * WebDAV configuration
 */
export interface WebDAVConfig {
  url: string;
  username: string;
  password: string;
  /** Custom path for WebDAV storage (optional, defaults to '/password-note/vault.json') */
  path?: string;
}

/**
 * User profile stored in local storage
 * Note: This is a single-user password manager, no username concept
 */
export interface UserProfile {
  webdav_config?: {
    encrypted_data: EncryptedData;
  };
}
