import React from 'react'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { DraggableField } from './DraggableField'
import type { TemplateField } from 'password-memo-core'

interface ExtendedTemplateField extends TemplateField {
  required?: boolean
}

interface DragDropContainerProps {
  fields: ExtendedTemplateField[]
  onUpdate: (index: number, updates: Partial<ExtendedTemplateField>) => void
  onRemove: (index: number) => void
  onReorder: (fields: ExtendedTemplateField[]) => void
  fieldTypes: Array<{ value: string; label: string }>
  t: (key: string, params?: any) => string
}

export function DragDropContainer({
  fields,
  onUpdate,
  onRemove,
  onReorder,
  fieldTypes,
  t
}: DragDropContainerProps) {
  const [activeField, setActiveField] = React.useState<ExtendedTemplateField | null>(null)
  
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  function handleDragStart(event: DragStartEvent) {
    const { active } = event
    const activeField = fields.find(field => field.id === active.id)
    setActiveField(activeField || null)
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event

    if (active.id !== over?.id) {
      const oldIndex = fields.findIndex((field) => field.id === active.id)
      const newIndex = fields.findIndex((field) => field.id === over?.id)
      
      if (oldIndex !== -1 && newIndex !== -1) {
        const newFields = arrayMove(fields, oldIndex, newIndex)
        onReorder(newFields)
      }
    }
    
    setActiveField(null)
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={fields.map(field => field.id)} strategy={verticalListSortingStrategy}>
        <div className="space-y-4">
          {fields.map((field, index) => (
            <DraggableField
              key={field.id}
              field={field}
              index={index}
              onUpdate={onUpdate}
              onRemove={onRemove}
              canRemove={fields.length > 1}
              fieldTypes={fieldTypes}
              t={t}
            />
          ))}
        </div>
      </SortableContext>
      
      <DragOverlay>
        {activeField ? (
          <div className="bg-slate-700/90 border border-slate-500 rounded-lg p-4 shadow-2xl transform rotate-2">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-1 rounded bg-slate-600">
                <div className="h-4 w-4 bg-slate-400 rounded"></div>
              </div>
              <span className="text-sm font-medium text-slate-200">
                {t('templateForm.field', { number: fields.findIndex(f => f.id === activeField.id) + 1 })}
              </span>
            </div>
            <div className="text-slate-300">
              {activeField.name || t('templateForm.fieldNamePlaceholder')}
            </div>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}