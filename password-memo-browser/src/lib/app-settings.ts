import { AppSettings } from '@/types/extension';
import browser from 'webextension-polyfill';

const STORAGE_KEY = 'app-settings';

const DEFAULT_SETTINGS: AppSettings = {
  language: 'zh-CN',
  theme: 'system',
  sync_enabled: false,
  auto_sync: false
};

/**
 * App Settings Manager for extension-specific configuration
 */
export class AppSettingsManager {
  private static instance: AppSettingsManager;
  private settings: AppSettings | null = null;

  private constructor() {}

  static getInstance(): AppSettingsManager {
    if (!AppSettingsManager.instance) {
      AppSettingsManager.instance = new AppSettingsManager();
    }
    return AppSettingsManager.instance;
  }

  /**
   * Load application settings from localStorage
   */
  async loadSettings(): Promise<AppSettings> {
    try {
      const result = await browser.storage.local.get(STORAGE_KEY);
      const stored = result[STORAGE_KEY];
      if (stored && typeof stored === 'string') {
        this.settings = JSON.parse(stored);
        return this.settings!;
      }

      // Return default settings if none exist
      this.settings = { ...DEFAULT_SETTINGS };
      await this.saveSettings(this.settings);
      return this.settings;
    } catch (error) {
      console.error('Failed to load app settings:', error);
      this.settings = { ...DEFAULT_SETTINGS };
      return this.settings;
    }
  }

  /**
   * Save application settings to localStorage
   */
  async saveSettings(settings: AppSettings): Promise<void> {
    try {
      await browser.storage.local.set({[STORAGE_KEY]: JSON.stringify(settings)});
      this.settings = settings;
    } catch (error) {
      console.error('Failed to save app settings:', error);
      throw new Error('Failed to save app settings');
    }
  }

  /**
   * Get current application settings
   */
  getSettings(): AppSettings | null {
    return this.settings;
  }

  /**
   * Update specific setting
   */
  async updateSetting<K extends keyof AppSettings>(
    key: K,
    value: AppSettings[K]
  ): Promise<void> {
    if (!this.settings) {
      await this.loadSettings();
    }

    const updatedSettings = { ...this.settings!, [key]: value };
    await this.saveSettings(updatedSettings);
  }

  /**
   * Reset to default settings
   */
  async resetSettings(): Promise<void> {
    await this.saveSettings({ ...DEFAULT_SETTINGS });
  }
}