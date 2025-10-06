import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Save } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useAuthStore } from '@/store/auth-store'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { useToastContext } from '@/contexts/ToastContext'

interface LabelFormData {
  name: string
  color: string
}

const PRESET_COLORS = [
  '#ef4444', '#f97316', '#f59e0b', '#eab308',
  '#84cc16', '#22c55e', '#10b981', '#06b6d4',
  '#0ea5e9', '#3b82f6', '#6366f1', '#8b5cf6',
  '#a855f7', '#d946ef', '#ec4899', '#f43f5e'
]

export function CreateLabelPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { passwordManager } = useAuthStore()
  const { showError } = useToastContext()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState<LabelFormData>({
    name: '',
    color: PRESET_COLORS[0]
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!passwordManager || !formData.name.trim()) {
      showError(t('labelForm.pleaseEnterLabelName'))
      return
    }

    setLoading(true)
    try {
      await passwordManager.createLabel(formData.name.trim(), formData.color)
      navigate('/labels')
    } catch (error) {
      console.error('Failed to create label:', error)
      showError(t('labelForm.failedToCreateLabel'))
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
          onClick={() => navigate('/labels')}
          className="text-slate-400 hover:text-white"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          {t('labelForm.back')}
        </Button>
        <h1 className="text-xl font-semibold text-white">{t('labelForm.createLabel')}</h1>
        <div className="w-16" /> {/* Spacer for centering */}
      </div>

      {/* Form Card */}
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white">{t('labelForm.labelDetails')}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-slate-200 mb-2">
                {t('labelForm.labelName')} *
              </label>
              <Input
                id="name"
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder={t('labelForm.labelNamePlaceholder')}
                required
                className="bg-slate-700 border-slate-600 text-white placeholder-slate-400"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-200 mb-3">
                {t('labelForm.color')}
              </label>
              <div className="grid grid-cols-8 gap-3">
                {PRESET_COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    className={`w-10 h-10 rounded-full border-2 transition-all ${
                      formData.color === color
                        ? 'border-white scale-110 shadow-lg'
                        : 'border-slate-600 hover:border-slate-400 hover:scale-105'
                    }`}
                    style={{ backgroundColor: color }}
                    onClick={() => setFormData({ ...formData, color })}
                  />
                ))}
              </div>
              
              {/* Preview */}
              <div className="mt-4 p-3 bg-slate-700/50 border border-slate-600 rounded-lg">
                <div className="text-xs text-slate-300 mb-1">{t('labelForm.preview')}</div>
                <span
                  className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium"
                  style={{ 
                    backgroundColor: formData.color + '20', 
                    color: formData.color,
                    border: `1px solid ${formData.color}40`
                  }}
                >
                  <div
                    className="w-2 h-2 rounded-full mr-2"
                    style={{ backgroundColor: formData.color }}
                  />
                  {formData.name || t('labelForm.labelNamePreview')}
                </span>
              </div>
            </div>

            <div className="flex justify-end space-x-3 pt-6">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate('/labels')}
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
                {loading ? t('labelForm.creating') : t('labelForm.createLabel')}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}