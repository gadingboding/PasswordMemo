import { useTranslation } from 'react-i18next';
import { AppSettingsManager } from '@/lib/app-settings';

const languages = [
  { code: 'zh-CN', name: '中文' },
  { code: 'en-US', name: 'English' }
];

export function LanguageSelector() {
  const { i18n } = useTranslation();

  const handleLanguageChange = async (languageCode: string) => {
    i18n.changeLanguage(languageCode);

    // Update app settings
    const settingsManager = AppSettingsManager.getInstance();
    await settingsManager.updateSetting('language', languageCode);
  };

  return (
    <select
      value={i18n.language}
      onChange={(e) => handleLanguageChange(e.target.value)}
      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
    >
      {languages.map((language) => (
        <option key={language.code} value={language.code}>
          {language.name}
        </option>
      ))}
    </select>
  );
}