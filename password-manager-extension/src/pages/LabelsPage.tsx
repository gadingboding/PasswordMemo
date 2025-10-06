import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Tag, Edit, Trash2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useAuthStore } from '@/store/auth-store'
import { Button } from '@/components/ui/Button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'

export function LabelsPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { passwordManager } = useAuthStore()
  const [labels, setLabels] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadLabels()
  }, [passwordManager])

  const loadLabels = async () => {
    if (!passwordManager) return

    try {
      const labelList = await passwordManager.getLabelList()
      setLabels(labelList)
    } catch (error) {
      console.error('Failed to load labels:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteLabel = async (labelId: string) => {
    if (!passwordManager || !confirm(t('dialogs.confirmDeleteLabel'))) return

    try {
      await passwordManager.deleteLabel(labelId)
      await loadLabels()
    } catch (error) {
      console.error('Failed to delete label:', error)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-2 text-sm text-slate-400">{t('labels.loadingLabels')}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="text-sm text-slate-400">
        {t('labels.description')}
      </div>

      {labels.length === 0 ? (
        <Card className="bg-slate-800 border-slate-700">
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <Tag className="h-12 w-12 text-slate-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-white mb-2">{t('labels.noLabelsYet')}</h3>
              <p className="text-slate-400 mb-4">
                {t('labels.noLabelsYetDesc')}
              </p>
              <Button 
                onClick={() => navigate('/labels/create')}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {t('labels.createLabel')}
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {labels.map((label) => (
            <Card key={label.id} className="bg-slate-800 border-slate-700 hover:bg-slate-800/80 transition-colors">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <CardTitle className="flex items-center text-white text-base">
                      <Tag className="w-4 h-4 mr-2 flex-shrink-0 text-slate-400" />
                      <span className="truncate">{label.name}</span>
                    </CardTitle>
                  </div>
                  <div className="flex space-x-1 ml-3">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => navigate(`/labels/edit/${label.id}`)}
                      className="text-slate-400 hover:text-white hover:bg-slate-700 h-8 w-8"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteLabel(label.id)}
                      className="text-slate-400 hover:text-red-400 hover:bg-red-900/20 h-8 w-8"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}