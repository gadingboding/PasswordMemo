/**
 * Application settings for extension configuration
 * Note: This contains settings not directly related to password management
 */
export interface AppSettings {
  language: string;
  theme: 'light' | 'dark' | 'system';
  last_sync_time?: string;
  sync_enabled: boolean;
  auto_sync: boolean;
}