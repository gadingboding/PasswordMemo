import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Download, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Dialog, DialogFooter } from '@/components/ui/Dialog'
import { useToastContext } from '../contexts/ToastContext'
import { PasswordManager } from 'password-memo-core'


export const ExportVault: React.FC = () => {
  const { t } = useTranslation()
  const { showSuccess, showError } = useToastContext()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleClickOpen = () => {
    setOpen(true)
  }

  const handleClose = () => {
    setOpen(false)
  }

  const handleExport = async () => {
    setLoading(true)

    try {
      const manager = PasswordManager.getInstance()
      const exportData = await manager.exportVault()
      const filename = `vault-encrypted-${new Date().toISOString().split('T')[0]}.json`

      // Create and trigger download
      const blob = new Blob([exportData], {type: 'application/json'})
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = filename
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)

      showSuccess(t('settings.exportSuccess'))
      handleClose()
    } catch (error) {
      console.error('Failed to export vault:', error)
      showError(t('settings.exportFailed', {error: error instanceof Error ? error.message : 'Unknown error'}))
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Button
        variant="outline"
        onClick={handleClickOpen}
        className="border-slate-600 text-slate-300 hover:bg-slate-700"
      >
        <Download className="h-4 w-4 mr-2" />
        {t('settings.exportVault')}
      </Button>

      {/* Export Confirmation Dialog */}
      <Dialog open={open} onClose={handleClose} title={t('settings.exportWarning')}>
        <div className="space-y-4">
          <div className="flex items-start">
            <AlertTriangle className="h-5 w-5 mr-2 text-amber-400 flex-shrink-0 mt-0.5" />
            <p className="text-slate-300">
              {t('settings.exportEncryptedWarning')}
            </p>
          </div>
          <p className="text-slate-300">
            {t('settings.exportVaultDesc')}
          </p>
          <div className="mt-4 p-4 border border-slate-600 rounded-lg bg-slate-700/50">
            <p className="text-slate-300 text-sm mb-3">
              {t('settings.exportEncryptedDesc')}
            </p>
          </div>
        </div>
        
        <DialogFooter>
          <Button 
            variant="outline" 
            onClick={handleClose}
            className="border-slate-600 text-slate-300 hover:bg-slate-700"
          >
            {t('common.cancel')}
          </Button>
          <Button
            onClick={handleExport}
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                {t('common.loading')}
              </>
            ) : (
              t('settings.confirmExport')
            )}
          </Button>
        </DialogFooter>
      </Dialog>
    </>
  )
}
