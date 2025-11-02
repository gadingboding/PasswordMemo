import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AlertTriangle, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card'

import {ResetSettingsDialog} from "@components/ResetSettingsDialog.tsx";

export function ResetSettings() {
  const { t } = useTranslation()
  const [showResetDialog, setShowResetDialog] = useState(false)

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
      <ResetSettingsDialog
        isOpen={showResetDialog}
        onClose={() => setShowResetDialog(false)}
        onResetComplete={() => setShowResetDialog(false)}
      />
    </>
  )
}