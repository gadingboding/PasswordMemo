import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AlertTriangle, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Dialog, DialogFooter } from '@/components/ui/Dialog'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card'
import { useAuthStore } from '@/store/auth-store'

export function ResetSettings() {
  const { t } = useTranslation()
  const { reset } = useAuthStore()
  const [showResetDialog, setShowResetDialog] = useState(false)
  const [isResetting, setIsResetting] = useState(false)

  const handleReset = async () => {
    setIsResetting(true)
    try {
      const success = await reset()
      if (success) {
        // Reset successful, the page will be redirected to login automatically
        // by the auth store state change
        setShowResetDialog(false)
      }
    } catch (error) {
      console.error('Reset failed:', error)
    } finally {
      setIsResetting(false)
    }
  }

  return (
    <>
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle className="flex items-center text-white">
            <RefreshCw className="h-5 w-5 mr-2 text-red-400" />
            {t('settings.reset')}
          </CardTitle>
          <CardDescription className="text-slate-400">
            {t('settings.resetDesc')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-start space-x-3">
              <AlertTriangle className="h-5 w-5 text-red-400 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-slate-300">
                <p className="font-medium text-red-400 mb-1">{t('settings.resetWarning')}</p>
                <p>{t('settings.resetWarningDetail')}</p>
              </div>
            </div>
            <Button
              variant="destructive"
              onClick={() => setShowResetDialog(true)}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {t('settings.resetButton')}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Reset Confirmation Dialog */}
      <Dialog
        open={showResetDialog}
        onClose={() => setShowResetDialog(false)}
        title={t('settings.resetConfirmTitle')}
      >
        <div className="space-y-4">
          <p className="text-slate-300">{t('settings.resetConfirmMessage')}</p>
          <div className="bg-red-900/20 border border-red-700 rounded-md p-3">
            <p className="text-sm text-red-300 font-medium">{t('settings.resetFinalWarning')}</p>
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setShowResetDialog(false)}
            disabled={isResetting}
          >
            {t('common.cancel')}
          </Button>
          <Button
            variant="destructive"
            onClick={handleReset}
            disabled={isResetting}
            className="bg-red-600 hover:bg-red-700"
          >
            {isResetting ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                {t('settings.resetting')}
              </>
            ) : (
              t('settings.confirmReset')
            )}
          </Button>
        </DialogFooter>
      </Dialog>
    </>
  )
}