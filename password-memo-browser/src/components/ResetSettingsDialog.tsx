import {Dialog, DialogFooter} from "@components/ui/Dialog.tsx";
import {Button} from "@components/ui/Button.tsx";
import {RefreshCw} from "lucide-react";
import {useTranslation} from "react-i18next";
import {useState} from "react";
import {useAuthStore} from "@/store/auth-store.ts";


interface ResetDialogProps {
  isOpen: boolean
  onClose: () => void
  onResetComplete: () => void
}

export function ResetSettingsDialog({isOpen, onClose, onResetComplete}: ResetDialogProps) {
  const { t } = useTranslation()
  const { reset } = useAuthStore()
  const [isResetting, setIsResetting] = useState(false)
    const handleReset = async () => {
    setIsResetting(true)
    try {
      await reset()
      onResetComplete()
    } catch (err) {
      console.error('Reset failed:', err)
      // Optionally, show an error message to the user
    } finally {
      setIsResetting(false)
    }
  }

  return <Dialog
    open={isOpen}
    onClose={onClose}
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
        onClick={onClose}
        disabled={isResetting}
        className="text-white"
      >
        {t('common.cancel')}
      </Button>
      <Button
        variant="destructive"
        onClick={handleReset}
        disabled={isResetting}
        className="bg-red-600 hover:bg-red-700 text-white"
      >
        {isResetting ? (
          <>
            <RefreshCw className="h-4 w-4 mr-2 animate-spin"/>
            {t('settings.resetting')}
          </>
        ) : (
          t('settings.confirmReset')
        )}
      </Button>
    </DialogFooter>
  </Dialog>
}