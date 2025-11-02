import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FileText, Edit, Trash2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useAuthStore } from '@/store/auth-store'
import { Button } from '@/components/ui/Button'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card'
import { useToastContext } from '@/contexts/ToastContext'

export function TemplatesPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { passwordManager } = useAuthStore()
  const { showError } = useToastContext()
  const [templates, setTemplates] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadTemplates()
  }, [passwordManager])

  const loadTemplates = async () => {
    if (!passwordManager) return

    try {
      const templateList = await passwordManager.getTemplateList()
      setTemplates(templateList)
    } catch (error) {
      console.error('Failed to load templates:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteTemplate = async (templateId: string) => {
    if (!passwordManager) return

    try {
      // Check if template is in use before deletion
      const isTemplateInUse = await (passwordManager as any).isTemplateInUse(templateId)
      
      if (isTemplateInUse) {
        showError(t('templateForm.cannotDeleteTemplateInUse'))
        return
      }

      if (!confirm(t('dialogs.confirmDeleteTemplate'))) return

      await passwordManager.deleteTemplate(templateId)
      await loadTemplates()
    } catch (error) {
      console.error('Failed to delete template:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      if (errorMessage.includes('being used by one or more records')) {
        showError(t('templateForm.cannotDeleteTemplateInUse'))
      } else {
        showError(t('templateForm.failedToDeleteTemplate'))
      }
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-2 text-sm text-slate-400">{t('templates.loadingTemplates')}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="text-sm text-slate-400">
        {t('templates.description')}
      </div>

      {templates.length === 0 ? (
        <Card className="bg-slate-800 border-slate-700">
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <FileText className="h-12 w-12 text-slate-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-white mb-2">{t('templates.noTemplatesYet')}</h3>
              <p className="text-slate-400 mb-4">
                {t('templates.noTemplatesYetDesc')}
              </p>
              <Button 
                onClick={() => navigate('/templates/create')}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {t('templates.createTemplate')}
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {templates.map((template) => (
            <Card key={template.id} className="bg-slate-800 border-slate-700 hover:bg-slate-800/80 transition-colors">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <CardTitle className="flex items-center text-white text-base">
                      <FileText className="h-4 w-4 mr-2 text-blue-400" />
                      <span className="truncate">{template.name}</span>
                    </CardTitle>
                    <CardDescription className="text-slate-400">
                      {t(`templates.fieldCount${template.fieldCount !== 1 ? '_plural' : ''}`, { count: template.fieldCount })}
                    </CardDescription>
                  </div>
                  <div className="flex space-x-1 ml-3">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => navigate(`/templates/edit/${template.id}`)}
                      className="text-slate-400 hover:text-white hover:bg-slate-700 h-8 w-8"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteTemplate(template.id)}
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