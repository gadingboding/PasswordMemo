import {Input} from '@/components/ui/Input'
import {PasswordInput} from '@/components/ui/PasswordInput'

import {useTranslation} from "react-i18next";
import {WebDAVConfig} from "password-memo-core";


interface WebDAVFormProps {
  webdavConfig: WebDAVConfig
  setWebdavConfig: (config: WebDAVConfig) => void
}


export function WebDAVForm({webdavConfig, setWebdavConfig}: WebDAVFormProps) {
  const {t} = useTranslation()
  
  // Configuration for input fields
  const inputFields = [
    {
      key: 'url' as keyof WebDAVConfig,
      type: 'url' as const,
      labelKey: 'sync.webdavUrl',
      placeholderKey: 'initialization.webDAVUrlPlaceholder',
    },
    {
      key: 'username' as keyof WebDAVConfig,
      type: 'text' as const,
      labelKey: 'sync.username',
      placeholderKey: 'sync.username',
    },
    {
      key: 'path' as keyof WebDAVConfig,
      type: 'text' as const,
      labelKey: 'sync.path',
      placeholderKey: 'sync.path',
    },
  ]
  
  const commonInputClassName = "bg-slate-700 border-slate-600 text-white placeholder-slate-400"
  
  return <>
    {/* Render regular input fields using loop */}
    {inputFields.map((field) => (
      <div key={field.key}>
        <label className="block text-sm font-medium text-slate-200 mb-2">
          {t(field.labelKey)}
        </label>
        <Input
          type={field.type}
          placeholder={t(field.placeholderKey)}
          value={webdavConfig[field.key] as string}
          onChange={(e) => setWebdavConfig({...webdavConfig, [field.key]: e.target.value})}
          required
          className={commonInputClassName}
        />
      </div>
    ))}
    
    {/* Password field (special case using PasswordInput) */}
    <div>
      <label className="block text-sm font-medium text-slate-200 mb-2">{t('sync.password')}</label>
      <PasswordInput
        placeholder={t('sync.password')}
        value={webdavConfig.password}
        onChange={(e) => setWebdavConfig({...webdavConfig, password: e.target.value})}
        required
        className={commonInputClassName}
      />
    </div>
  </>
}

WebDAVForm.displayName = 'WebDAVForm';