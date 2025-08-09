/**
 * KDF Configuration API
 *
 * Provides a high-level interface for managing KDF configurations in the password manager.
 */

import {
  KDFConfig,
  KDFAlgorithm,
  KDFValidationResult,
  KDFUpdateResult,
  PBKDF2Params,
  KDF_ALGORITHMS,
  DEFAULT_KDF_CONFIG
} from './types/index.js';
import {KDFManager} from './kdf-manager.js';
import {VaultManager} from './vault-manager.js';

/**
 * KDF Configuration API
 */
export class KDFConfigAPI {
  private kdfManager: KDFManager;
  private vaultManager: VaultManager;

  constructor(vaultManager: VaultManager) {
    this.kdfManager = new KDFManager();
    this.vaultManager = vaultManager;
  }

  /**
   * Get the current KDF configuration from the vault
   */
  getCurrentKDFConfig(): KDFConfig | null {
    return this.vaultManager.getKDFConfig();
  }


  /**
   * Create a new KDF configuration with a random salt
   */
  async createKDFConfig(algorithm: KDFAlgorithm): Promise<KDFConfig> {
    return this.kdfManager.createDefaultConfig(algorithm);
  }

  /**
   * Validate KDF configuration
   */
  validateKDFConfig(config: KDFConfig): KDFValidationResult {
    return this.kdfManager.validateConfig(config);
  }

  /**
   * Update KDF configuration and re-encrypt all vault data
   */
  async updateKDFConfig(newConfig: KDFConfig, password: string): Promise<KDFUpdateResult> {
    try {
      // Check if vault is unlocked
      if (!this.vaultManager.isUnlocked()) {
        return {
          success: false,
          error: 'Vault must be unlocked to update KDF configuration'
        };
      }

      // Validate the new configuration
      const validation = this.validateKDFConfig(newConfig);
      if (!validation.valid) {
        return {
          success: false,
          error: `Invalid KDF configuration: ${validation.errors?.join(', ')}`
        };
      }

      // Verify the password by attempting to derive a key with the current configuration
      const currentConfig = this.getCurrentKDFConfig();
      if (!currentConfig) {
        return {
          success: false,
          error: 'Current KDF configuration not found'
        };
      }

      try {
        // Test password with current configuration
        await this.kdfManager.deriveKey(password, currentConfig);
      } catch (error) {
        return {
          success: false,
          error: 'Invalid password'
        };
      }

      // Check if the new configuration is actually different
      if (this.kdfManager.areConfigsCompatible(currentConfig, newConfig)) {
        return {
          success: false,
          error: 'New KDF configuration is identical to current configuration'
        };
      }

      // Update KDF configuration and re-encrypt all data
      await this.vaultManager.updateKDFConfig(newConfig, password);

      return {
        success: true
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update KDF configuration'
      };
    }
  }
}