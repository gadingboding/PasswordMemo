import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
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

export function CreateTemplatePage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { passwordManager } = useAuthStore()
  const { showError } = useToastContext()
  const FIELD_TYPES = getFieldTypes(t)
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState<TemplateFormData>({
    name: '',
    fields: [{ id: crypto.randomUUID(), name: '', type: 'text', optional: false }]
  })

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
    if (!passwordManager || !formData.name.trim() || formData.fields.some(f => !f.name.trim())) {
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

      await passwordManager.createTemplate(formData.name.trim(), fieldsData)
      navigate('/templates')
    } catch (error) {
      console.error('Failed to create template:', error)
      showError(t('templateForm.failedToCreateTemplate'))
    } finally {
      setLoading(false)
    }
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
        <h1 className="text-xl font-semibold text-white">{t('templateForm.createTemplate')}</h1>
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
                {loading ? t('templateForm.creating') : t('templateForm.createTemplate')}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}