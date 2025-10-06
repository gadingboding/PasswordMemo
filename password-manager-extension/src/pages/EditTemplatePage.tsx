import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Plus, X, Save } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useAuthStore } from '@/store/auth-store'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import type { TemplateField } from 'password-manager-core'
import { useToastContext } from '@/contexts/ToastContext'

interface ExtendedTemplateField extends TemplateField {
  required?: boolean
}

interface TemplateFormData {
  name: string
  fields: ExtendedTemplateField[]
}

const getFieldTypes = (t: any) => [
  { value: 'text', label: t('fieldTypes.text') },
  { value: 'password', label: t('fieldTypes.password') },
  { value: 'email', label: t('fieldTypes.email') },
  { value: 'url', label: t('fieldTypes.url') },
  { value: 'textarea', label: t('fieldTypes.textarea') }
]

export function EditTemplatePage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const { passwordManager } = useAuthStore()
  const { showError } = useToastContext()
  const FIELD_TYPES = getFieldTypes(t)
  const [loading, setLoading] = useState(false)
  const [initialLoading, setInitialLoading] = useState(true)
  const [template, setTemplate] = useState<any>(null)
  const [formData, setFormData] = useState<TemplateFormData>({
    name: '',
    fields: [{ id: crypto.randomUUID(), name: '', type: 'text', optional: false }]
  })

  useEffect(() => {
    if (id) {
      loadTemplate(id)
    }
  }, [id, passwordManager])

  const loadTemplate = async (templateId: string) => {
    if (!passwordManager) return

    try {
      const templateData = await passwordManager.getTemplate(templateId)
      if (templateData) {
        setTemplate(templateData)
        setFormData({
          name: templateData.name,
          fields: templateData.fields
        })
      }
    } catch (error) {
      console.error('Failed to load template:', error)
    } finally {
      setInitialLoading(false)
    }
  }

  const handleAddField = () => {
    setFormData({
      ...formData,
      fields: [...formData.fields, { id: crypto.randomUUID(), name: '', type: 'text', optional: false }]
    })
  }

  const handleRemoveField = (index: number) => {
    if (formData.fields.length > 1) {
      setFormData({
        ...formData,
        fields: formData.fields.filter((_, i) => i !== index)
      })
    }
  }

  const handleFieldChange = (index: number, updates: Partial<ExtendedTemplateField>) => {
    const newFields = [...formData.fields]
    newFields[index] = { ...newFields[index], ...updates }
    setFormData({ ...formData, fields: newFields })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!passwordManager || !formData.name.trim() || formData.fields.some(f => !f.name.trim()) || !id) {
      showError(t('templateForm.pleaseFillRequiredFields'))
      return
    }

    setLoading(true)
    try {
      const fieldsData: TemplateField[] = formData.fields.map(f => ({
        id: f.id,
        name: f.name.trim(),
        type: f.type,
        optional: f.optional ?? false
      }))

      await passwordManager.updateTemplate(id, {
        name: formData.name.trim(),
        fields: fieldsData
      })
      navigate('/templates')
    } catch (error) {
      console.error('Failed to update template:', error)
      showError(t('templateForm.failedToUpdateTemplate'))
    } finally {
      setLoading(false)
    }
  }

  if (initialLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-2 text-sm text-slate-400">{t('templateForm.loadingTemplate')}</p>
        </div>
      </div>
    )
  }

  if (!template) {
    return (
      <div className="text-center py-8">
        <h3 className="text-lg font-medium text-white mb-2">{t('templateForm.templateNotFound')}</h3>
        <p className="text-slate-400 mb-4">{t('templateForm.templateNotFoundDesc')}</p>
        <Button onClick={() => navigate('/templates')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          {t('templateForm.backToTemplates')}
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/templates')}
          className="text-slate-400 hover:text-white"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          {t('templateForm.back')}
        </Button>
        <h1 className="text-xl font-semibold text-white">{t('templateForm.editTemplate')}</h1>
        <div className="w-16" /> {/* Spacer for centering */}
      </div>

      {/* Form Card */}
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white">{t('templateForm.templateDetails')}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-slate-200 mb-2">
                {t('templateForm.templateName')} *
              </label>
              <Input
                id="name"
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder={t('templateForm.templateNamePlaceholder')}
                required
                className="bg-slate-700 border-slate-600 text-white placeholder-slate-400"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="block text-sm font-medium text-slate-200">
                  {t('templateForm.fields')} *
                </label>
                <Button 
                  type="button" 
                  size="sm" 
                  onClick={handleAddField}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <Plus className="h-3 w-3 mr-1" />
                  {t('templateForm.addField')}
                </Button>
              </div>

              <div className="space-y-4">
                {formData.fields.map((field, index) => (
                  <div key={field.id} className="bg-slate-700/50 border border-slate-600 rounded-lg p-4">
                    <div className="flex items-start justify-between mb-3">
                      <span className="text-sm font-medium text-slate-300">{t('templateForm.field', { number: index + 1 })}</span>
                      {formData.fields.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveField(index)}
                          className="text-slate-400 hover:text-red-400 h-6 w-6"
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                    
                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs font-medium text-slate-300 mb-1">
                          {t('templateForm.fieldName')} *
                        </label>
                        <Input
                          type="text"
                          value={field.name}
                          onChange={(e) => handleFieldChange(index, { name: e.target.value })}
                          placeholder={t('templateForm.fieldNamePlaceholder')}
                          required
                          className="bg-slate-700 border-slate-600 text-white placeholder-slate-400"
                        />
                      </div>
                      
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-slate-300 mb-1">
                            {t('templateForm.fieldType')}
                          </label>
                          <Select
                            value={field.type}
                            onChange={(value) => handleFieldChange(index, { type: value as any })}
                            options={FIELD_TYPES}
                            className="bg-slate-700 border-slate-600"
                          />
                        </div>
                        
                        <div className="flex items-end">
                          <label className="flex items-center gap-2 text-xs text-slate-300">
                            <input
                              type="checkbox"
                              checked={!field.optional}
                              onChange={(e) => handleFieldChange(index, { optional: !e.target.checked })}
                              className="rounded border-slate-600 bg-slate-700"
                            />
                            {t('templateForm.requiredField')}
                          </label>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end space-x-3 pt-6">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate('/templates')}
                className="border-slate-600 text-slate-300 hover:bg-slate-700"
              >
                {t('common.cancel')}
              </Button>
              <Button 
                type="submit" 
                disabled={loading}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                <Save className="h-4 w-4 mr-2" />
                {loading ? t('templateForm.updating') : t('templateForm.editTemplate')}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}