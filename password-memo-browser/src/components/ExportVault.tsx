import {useState} from 'react'
import {useTranslation} from 'react-i18next'
import {Download, AlertTriangle, Lock} from 'lucide-react'
import {Button} from '@/components/ui/Button'
import {Card, CardHeader, CardTitle, CardDescription, CardContent} from '@/components/ui/Card'
import {Dialog, DialogFooter} from '@/components/ui/Dialog'
import {useToast} from '@/hooks/useToast'
import {PasswordManager} from 'password-memo-core'

interface ExportVaultProps {
  passwordManager: PasswordManager
}

export function ExportVault({passwordManager}: ExportVaultProps) {
  const {t} = useTranslation()
  const {addToast} = useToast()
  const [isExporting, setIsExporting] = useState(false)
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)

  const handleExport = async () => {
    setShowConfirmDialog(true)
  }

  const confirmExport = async () => {
    setShowConfirmDialog(false)
    setIsExporting(true)

    try {
      const exportData = await passwordManager.exportVault()
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

      addToast('success', t('settings.exportSuccess'))
    } catch (error) {
      addToast('error', t('settings.exportFailed', {error: error instanceof Error ? error.message : 'Unknown error'}))
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <>
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle className="flex items-center text-white">
            <Download className="h-5 w-5 mr-2 text-green-400"/>
            {t('settings.exportVault')}
          </CardTitle>
          <CardDescription className="text-slate-400">
            {t('settings.exportVaultDesc')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Encrypted Export */}
            <div className="p-4 border border-slate-600 rounded-lg bg-slate-700/50">
              <div className="flex items-center mb-2">
                <Lock className="h-5 w-5 mr-2 text-blue-400"/>
                <h3 className="text-white font-medium">{t('settings.exportEncrypted')}</h3>
              </div>
              <p className="text-slate-300 text-sm mb-3">
                {t('settings.exportEncryptedDesc')}
              </p>
              <Button
                onClick={handleExport}
                disabled={isExporting}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white"
              >
                {isExporting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    {t('settings.exporting')}
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4 mr-2"/>
                    {t('settings.downloadFile')}
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Confirmation Dialog */}
      <Dialog
        open={showConfirmDialog}
        onClose={() => setShowConfirmDialog(false)}
        title={t('settings.exportWarning')}
      >
        <div className="flex items-start mb-4">
          <AlertTriangle className="h-5 w-5 mr-2 text-amber-400 flex-shrink-0 mt-0.5"/>
          <p className="text-slate-300">
            {t('settings.exportEncryptedWarning')}
          </p>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setShowConfirmDialog(false)}
            className="border-slate-600 text-slate-300 hover:bg-slate-700"
          >
            {t('common.cancel')}
          </Button>
          <Button
            onClick={confirmExport}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            {t('settings.confirmExport')}
          </Button>
        </DialogFooter>
      </Dialog>
    </>
  )
}