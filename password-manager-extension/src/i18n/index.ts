import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { AppSettingsManager } from '@/lib/app-settings';

import zhCN from './locales/zh-CN.json';
import enUS from './locales/en-US.json';

const resources = {
  'zh-CN': {
    translation: zhCN
  },
  'en-US': {
    translation: enUS
  }
};

const initI18n = async () => {
  try {
    const settingsManager = AppSettingsManager.getInstance();
    const settings = await settingsManager.loadSettings();

    await i18n
      .use(initReactI18next)
      .init({
        resources,
        lng: settings.language || 'zh-CN',
        fallbackLng: 'zh-CN',
        interpolation: {
          escapeValue: false
        }
      });
  } catch (error) {
    console.error('Failed to initialize i18n:', error);
    // Initialize with default language if settings fail to load
    await i18n
      .use(initReactI18next)
      .init({
        resources,
        lng: 'zh-CN',
        fallbackLng: 'zh-CN',
        interpolation: {
          escapeValue: false
        }
      });
  }
};

// Initialize i18n asynchronously and wait for it to complete
export const initializeI18n = initI18n();

export default i18n;
export { initI18n };