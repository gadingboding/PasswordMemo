import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Plus, X, Save } from 'lucide-react'
import { useAuthStore } from '@/store/auth-store'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import type { TemplateField } from 'password-manager-core'

interface ExtendedTemplateField extends TemplateField {
  required?: boolean
}

interface TemplateFormData {
  name: string
  fields: ExtendedTemplateField[]
}

const FIELD_TYPES = [
  { value: 'text', label: 'Text' },
  { value: 'password', label: 'Password' },
  { value: 'email', label: 'Email' },
  { value: 'url', label: 'URL' },
  { value: 'textarea', label: 'Textarea' }
]

export function CreateTemplatePage() {
  const navigate = useNavigate()
  const { passwordManager } = useAuthStore()
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
      alert('Please fill in all required fields')
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
      alert('Failed to create template')
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
          Back
        </Button>
        <h1 className="text-xl font-semibold text-white">Create Template</h1>
        <div className="w-16" /> {/* Spacer for centering */}
      </div>

      {/* Form Card */}
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white">Template Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-slate-200 mb-2">
                Template Name *
              </label>
              <Input
                id="name"
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Enter template name"
                required
                className="bg-slate-700 border-slate-600 text-white placeholder-slate-400"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="block text-sm font-medium text-slate-200">
                  Fields *
                </label>
                <Button 
                  type="button" 
                  size="sm" 
                  onClick={handleAddField}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Add Field
                </Button>
              </div>

              <div className="space-y-4">
                {formData.fields.map((field, index) => (
                  <div key={field.id} className="bg-slate-700/50 border border-slate-600 rounded-lg p-4">
                    <div className="flex items-start justify-between mb-3">
                      <span className="text-sm font-medium text-slate-300">Field {index + 1}</span>
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
                          Field Name *
                        </label>
                        <Input
                          type="text"
                          value={field.name}
                          onChange={(e) => handleFieldChange(index, { name: e.target.value })}
                          placeholder="Enter field name"
                          required
                          className="bg-slate-700 border-slate-600 text-white placeholder-slate-400"
                        />
                      </div>
                      
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-slate-300 mb-1">
                            Field Type
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
                            Required Field
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
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={loading}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                <Save className="h-4 w-4 mr-2" />
                {loading ? 'Creating...' : 'Create Template'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}