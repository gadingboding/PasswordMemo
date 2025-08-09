import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Eye, EyeOff, Save } from 'lucide-react'
import { useAuthStore } from '@/store/auth-store'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'

interface RecordFormData {
  title: string
  templateId: string
  fieldData: Record<string, string>
  labelIds: string[]
}

export function CreateRecordPage() {
  const navigate = useNavigate()
  const { passwordManager } = useAuthStore()
  const [templates, setTemplates] = useState<any[]>([])
  const [labels, setLabels] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState<RecordFormData>({
    title: '',
    templateId: '',
    fieldData: {},
    labelIds: []
  })
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({})
  const [templateFields, setTemplateFields] = useState<any[]>([])

  useEffect(() => {
    loadTemplates()
    loadLabels()
  }, [passwordManager])

  const loadTemplates = async () => {
    if (!passwordManager) return

    try {
      const templateList = await passwordManager.getTemplateList()
      setTemplates(templateList)
      if (templateList.length > 0) {
        setFormData(prev => ({ ...prev, templateId: templateList[0].id }))
        handleTemplateChange(templateList[0].id)
      }
    } catch (error) {
      console.error('Failed to load templates:', error)
    }
  }

  const loadLabels = async () => {
    if (!passwordManager) return

    try {
      const labelList = await passwordManager.getLabelList()
      setLabels(labelList)
    } catch (error) {
      console.error('Failed to load labels:', error)
    }
  }

  const handleTemplateChange = async (templateId: string) => {
    if (!passwordManager) return

    try {
      const template = await passwordManager.getTemplate(templateId)
      
      if (template) {
        setTemplateFields(template.fields)
        
        // Initialize field data with empty values using field names as keys
        const initialFieldData: Record<string, string> = {}
        template.fields.forEach(field => {
          initialFieldData[field.name] = ''
        })

        setFormData(prev => ({
          ...prev,
          templateId,
          fieldData: initialFieldData
        }))
      }
    } catch (error) {
      console.error('Failed to load template:', error)
    }
  }

  const handleFieldDataChange = (fieldName: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      fieldData: {
        ...prev.fieldData,
        [fieldName]: value
      }
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!passwordManager || !formData.title.trim() || !formData.templateId) {
      alert('Please fill in all required fields')
      return
    }

    setLoading(true)
    try {
      await passwordManager.createRecord(
        formData.templateId,
        formData.title.trim(),
        formData.fieldData,
        formData.labelIds
      )
      
      navigate('/records')
    } catch (error) {
      console.error('Failed to create record:', error)
      alert('Failed to create record')
    } finally {
      setLoading(false)
    }
  }

  const togglePasswordVisibility = (fieldName: string) => {
    setShowPasswords(prev => ({
      ...prev,
      [fieldName]: !prev[fieldName]
    }))
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/records')}
          className="text-slate-400 hover:text-white"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <h1 className="text-xl font-semibold text-white">Create Record</h1>
        <div className="w-16" /> {/* Spacer for centering */}
      </div>

      {/* Form Card */}
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white">Record Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-slate-200 mb-2">
                Title *
              </label>
              <Input
                id="title"
                type="text"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Enter record title"
                required
                className="bg-slate-700 border-slate-600 text-white placeholder-slate-400"
              />
            </div>

            <div>
              <label htmlFor="template" className="block text-sm font-medium text-slate-200 mb-2">
                Template *
              </label>
              <Select
                value={formData.templateId}
                onChange={handleTemplateChange}
                options={templates.map(t => ({ value: t.id, label: t.name }))}
                placeholder="Select a template"
                className="bg-slate-700 border-slate-600 text-white"
              />
            </div>

            {templateFields.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-slate-200 mb-3">
                  Fields
                </label>
                <div className="space-y-4">
                  {templateFields.map((field) => (
                    <div key={field.id}>
                      <label htmlFor={field.name} className="block text-sm font-medium text-slate-300 mb-1">
                        {field.name} {!field.optional && '*'}
                      </label>
                      {field.type === 'textarea' ? (
                        <textarea
                          id={field.name}
                          value={formData.fieldData[field.name] || ''}
                          onChange={(e) => handleFieldDataChange(field.name, e.target.value)}
                          placeholder={`Enter ${field.name.toLowerCase()}`}
                          required={!field.optional}
                          className="flex min-h-[80px] w-full rounded-md border border-slate-600 bg-slate-700 px-3 py-2 text-sm text-white ring-offset-background placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        />
                      ) : (
                        <div className="relative">
                          <Input
                            id={field.name}
                            type={field.type === 'password' ? (showPasswords[field.name] ? 'text' : 'password') : field.type}
                            value={formData.fieldData[field.name] || ''}
                            onChange={(e) => handleFieldDataChange(field.name, e.target.value)}
                            placeholder={`Enter ${field.name.toLowerCase()}`}
                            required={!field.optional}
                            className="bg-slate-700 border-slate-600 text-white placeholder-slate-400"
                          />
                          {field.type === 'password' && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="absolute right-0 top-0 h-full px-3 text-slate-400 hover:text-white"
                              onClick={() => togglePasswordVisibility(field.name)}
                            >
                              {showPasswords[field.name] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {labels.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-slate-200 mb-3">
                  Labels (optional)
                </label>
                <div className="flex flex-wrap gap-2">
                  {labels.map((label) => (
                    <label key={label.id} className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.labelIds.includes(label.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setFormData(prev => ({
                              ...prev,
                              labelIds: [...prev.labelIds, label.id]
                            }))
                          } else {
                            setFormData(prev => ({
                              ...prev,
                              labelIds: prev.labelIds.filter(id => id !== label.id)
                            }))
                          }
                        }}
                        className="rounded border-slate-600 bg-slate-700"
                      />
                      <span
                        className="inline-flex items-center px-2 py-1 rounded-full text-xs"
                        style={{ backgroundColor: label.color + '20', color: label.color }}
                      >
                        {label.name}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end space-x-3 pt-6">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate('/records')}
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
                {loading ? 'Creating...' : 'Create Record'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}