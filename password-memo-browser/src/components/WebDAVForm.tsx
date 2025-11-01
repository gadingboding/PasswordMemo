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
  return <>
    <div>
      <label className="block text-sm font-medium text-slate-200 mb-2">{t('sync.webdavUrl')}</label>
      <Input
        type="url"
        placeholder={t('initialization.webDAVUrlPlaceholder')}
        value={webdavConfig.url}
        onChange={(e) => setWebdavConfig({...webdavConfig, url: e.target.value})}
        required
        className="bg-slate-700 border-slate-600 text-white placeholder-slate-400"
      />
    </div>
    <div>
      <label className="block text-sm font-medium text-slate-200 mb-2">{t('sync.username')}</label>
      <Input
        type="text"
        placeholder={t('sync.username')}
        value={webdavConfig.username}
        onChange={(e) => setWebdavConfig({...webdavConfig, username: e.target.value})}
        required
        className="bg-slate-700 border-slate-600 text-white placeholder-slate-400"
      />
    </div>
    <div>
      <label className="block text-sm font-medium text-slate-200 mb-2">{t('sync.password')}</label>
      <PasswordInput
        placeholder={t('sync.password')}
        value={webdavConfig.password}
        onChange={(e) => setWebdavConfig({...webdavConfig, password: e.target.value})}
        required
        className="bg-slate-700 border-slate-600 text-white placeholder-slate-400"
      />
    </div>
  </>
}

// export function WebDAVForm({webdavConfig, setWebdavConfig}: WebDAVFormProps)