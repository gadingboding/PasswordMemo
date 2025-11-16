import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical, X } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import type { TemplateField } from 'password-memo-core'

interface ExtendedTemplateField extends TemplateField {
  required?: boolean
}

interface DraggableFieldProps {
  field: ExtendedTemplateField
  index: number
  onUpdate: (index: number, updates: Partial<ExtendedTemplateField>) => void
  onRemove: (index: number) => void
  canRemove: boolean
  fieldTypes: Array<{ value: string; label: string }>
  t: (key: string, params?: any) => string
}

export function DraggableField({
  field,
  index,
  onUpdate,
  onRemove,
  canRemove,
  fieldTypes,
  t
}: DraggableFieldProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: field.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`bg-slate-700/50 border border-slate-600 rounded-lg p-4 ${
        isDragging ? 'dragging' : ''
      }`}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <div
            {...attributes}
            {...listeners}
            className="drag-handle p-1 rounded hover:bg-slate-600 transition-colors"
          >
            <GripVertical className="h-4 w-4 text-slate-400" />
          </div>
          <span className="text-sm font-medium text-slate-300">
            {t('templateForm.field', { number: index + 1 })}
          </span>
        </div>
        {canRemove && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => onRemove(index)}
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
            onChange={(e) => onUpdate(index, { name: e.target.value })}
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
              onChange={(value) => onUpdate(index, { type: value as any })}
              options={fieldTypes}
              className="bg-slate-700 border-slate-600"
            />
          </div>
          
          <div className="flex items-end">
            <label className="flex items-center gap-2 text-xs text-slate-300">
              <input
                type="checkbox"
                checked={!field.optional}
                onChange={(e) => onUpdate(index, { optional: !e.target.checked })}
                className="rounded border-slate-600 bg-slate-700"
              />
              {t('templateForm.requiredField')}
            </label>
          </div>
        </div>
      </div>
    </div>
  )
}