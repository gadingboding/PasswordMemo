/**
 * Application settings for extension configuration
 * Note: This contains settings not directly related to password management
 */
export interface AppSettings {
  language: string;
  theme: 'light' | 'dark' | 'system';
  auto_lock_timeout: number; // in seconds
  clipboard_clear_timeout: number; // in seconds
  last_sync_time?: string;
  sync_enabled: boolean;
  auto_sync: boolean;
  webdav_config?: {
    url: string;
    username: string;
    password: string;
  };
}