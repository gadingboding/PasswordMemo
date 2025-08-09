/**
 * Configuration Manager
 *
 * Manages application configuration including user settings, security preferences,
 * and synchronization options.
 */

import {
  WebDAVConfig,
  UserProfile,
} from './types/index.js';
import {CryptographyEngine} from './crypto-engine.js';
import {EnvironmentManager, IStorageAdapter} from './environment-manager.js';

/**
 * Configuration Manager class
 */
export class ConfigurationManager {
  private environmentManager: EnvironmentManager;
  private userProfile: UserProfile | null = null;
  private webdavConfig: WebDAVConfig | null = null;

  constructor() {
    this.environmentManager = EnvironmentManager.getInstance();
  }

  /**
   * Get the storage adapter
   * @private
   */
  private get storage(): IStorageAdapter {
    return this.environmentManager.getStorage();
  }

  /**
   * Load user profile from storage
   */
  async loadUserProfile(): Promise<UserProfile | null> {
    try {
      const profileData = await this.storage.read('user-profile');
      if (profileData) {
        this.userProfile = JSON.parse(profileData);
        return this.userProfile;
      }
      return null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Save user profile to storage
   */
  async saveUserProfile(profile: UserProfile): Promise<void> {
    try {
      await this.storage.write('user-profile', JSON.stringify(profile));
      this.userProfile = profile;
    } catch (error) {
      throw new Error('Failed to save user profile');
    }
  }

  /**
   * Get current user profile
   */
  getUserProfile(): UserProfile | null {
    return this.userProfile;
  }

  /**
   * Load WebDAV configuration (encrypted)
   */
  async loadWebDAVConfig(masterKey: Uint8Array): Promise<WebDAVConfig | null> {
    if (!this.userProfile) {
      throw new Error('User profile not loaded');
    }

    if (!this.userProfile.webdav_config) {
      return null;
    }

    try {
      const encryptedData = this.userProfile.webdav_config.encrypted_data;
      const decryptedData = await CryptographyEngine.decryptToString(encryptedData, masterKey);
      this.webdavConfig = JSON.parse(decryptedData);
      return this.webdavConfig;
    } catch (error) {
      return null;
    }
  }

  /**
   * Save WebDAV configuration (encrypted)
   */
  async saveWebDAVConfig(config: WebDAVConfig, masterKey: Uint8Array): Promise<void> {
    if (!this.userProfile) {
      throw new Error('User profile not loaded');
    }

    try {
      const configJson = JSON.stringify(config);
      const encryptedData = await CryptographyEngine.encrypt(configJson, masterKey);

      this.userProfile.webdav_config = {
        encrypted_data: encryptedData
      };

      this.webdavConfig = config;
      await this.saveUserProfile(this.userProfile);
    } catch (error) {
      throw new Error('Failed to save WebDAV configuration');
    }
  }

  /**
   * Get current WebDAV configuration
   */
  getWebDAVConfig(): WebDAVConfig | null {
    return this.webdavConfig;
  }

  /**
   * Clear WebDAV configuration
   */
  async clearWebDAVConfig(): Promise<void> {
    if (!this.userProfile) {
      throw new Error('User profile not loaded');
    }

    this.userProfile.webdav_config = undefined;
    this.webdavConfig = null;
    await this.saveUserProfile(this.userProfile);
  }

  /**
   * Clear all configuration data
   */
  async clearAll(): Promise<void> {
    try {
      await this.storage.remove('user-profile');
      await this.storage.remove('vault');
      this.userProfile = null;
      this.webdavConfig = null;
    } catch (error) {
      throw new Error('Failed to clear configuration data');
    }
  }
}