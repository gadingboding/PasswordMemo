import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Eye, Edit, Trash2, X, Key } from 'lucide-react'
import { useAuthStore } from '@/store/auth-store'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Dialog, DialogFooter } from '@/components/ui/Dialog'

export function RecordsPage() {
  const navigate = useNavigate()
  const { passwordManager } = useAuthStore()
  const [records, setRecords] = useState<any[]>([])
  const [labels, setLabels] = useState<any[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedLabelIds, setSelectedLabelIds] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [showViewDialog, setShowViewDialog] = useState(false)
  const [viewingRecord, setViewingRecord] = useState<any>(null)
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({})

  useEffect(() => {
    loadRecords()
    loadLabels()
  }, [passwordManager])

  const loadRecords = async () => {
    if (!passwordManager) return

    try {
      const recordList = await passwordManager.getRecordList()
      setRecords(recordList)
    } catch (error) {
      console.error('Failed to load records:', error)
    } finally {
      setLoading(false)
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

  const filteredRecords = records.filter((record) => {
    // Filter by search query
    const matchesSearch = record.title.toLowerCase().includes(searchQuery.toLowerCase())
    
    // Filter by selected labels (if any labels are selected)
    const matchesLabels = selectedLabelIds.length === 0 ||
      selectedLabelIds.some(labelId => record.labels.includes(labelId))
    
    return matchesSearch && matchesLabels
  })

  const handleDeleteRecord = async (recordId: string) => {
    if (!passwordManager || !confirm('Are you sure you want to delete this record?')) return

    try {
      await passwordManager.deleteRecord(recordId)
      await loadRecords()
    } catch (error) {
      console.error('Failed to delete record:', error)
    }
  }

  const handleView = async (recordId: string) => {
    if (!passwordManager) return
    
    try {
      const record = await passwordManager.getRecord(recordId)
      if (record) {
        // Get template details to display field names correctly
        const templateDetail = await passwordManager.getTemplate(record.template)
        setViewingRecord({ ...record, templateDetail })
        setShowViewDialog(true)
      }
    } catch (error) {
      console.error('Failed to load record:', error)
    }
  }

  const togglePasswordVisibility = (fieldId: string) => {
    setShowPasswords(prev => ({
      ...prev,
      [fieldId]: !prev[fieldId]
    }))
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-2 text-sm text-slate-400">Loading records...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Search and Filter Bar */}
      <div className="space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search records..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-slate-800 border-slate-600 text-white placeholder-slate-400"
          />
        </div>

        {/* Label Filters */}
        {labels.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-slate-300">Filter by labels:</span>
              {selectedLabelIds.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedLabelIds([])}
                  className="h-auto p-1 text-xs text-slate-400 hover:text-white"
                >
                  Clear filters
                </Button>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {labels.map((label) => {
                const isSelected = selectedLabelIds.includes(label.id)
                return (
                  <button
                    key={label.id}
                    onClick={() => {
                      if (isSelected) {
                        setSelectedLabelIds(selectedLabelIds.filter(id => id !== label.id))
                      } else {
                        setSelectedLabelIds([...selectedLabelIds, label.id])
                      }
                    }}
                    className={`inline-flex items-center px-3 py-1 rounded-full text-sm transition-all ${
                      isSelected
                        ? 'ring-2 ring-offset-2 ring-offset-slate-900 font-medium'
                        : 'opacity-70 hover:opacity-100'
                    }`}
                    style={{
                      backgroundColor: label.color + (isSelected ? '40' : '20'),
                      color: label.color
                    }}
                  >
                    {label.name}
                    {isSelected && <X className="h-3 w-3 ml-1" />}
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* Active Filter Summary */}
        {(selectedLabelIds.length > 0 || searchQuery) && (
          <div className="flex items-center justify-between bg-slate-800/50 rounded-lg p-3 border border-slate-700">
            <div className="flex items-center space-x-2">
              <span className="text-sm text-slate-300">
                {filteredRecords.length} record{filteredRecords.length !== 1 ? 's' : ''} found
                {searchQuery && ` for "${searchQuery}"`}
                {selectedLabelIds.length > 0 && ` with ${selectedLabelIds.length} label${selectedLabelIds.length !== 1 ? 's' : ''}`}
              </span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSearchQuery('')
                setSelectedLabelIds([])
              }}
              className="h-auto p-1 text-slate-400 hover:text-white"
            >
              <X className="h-4 w-4 mr-1" />
              Clear all
            </Button>
          </div>
        )}
      </div>

      {filteredRecords.length === 0 ? (
        <Card className="bg-slate-800 border-slate-700">
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <Key className="h-12 w-12 text-slate-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-white mb-2">
                {searchQuery ? 'No records found' : 'No records yet'}
              </h3>
              <p className="text-slate-400 mb-4">
                {searchQuery
                  ? 'Try adjusting your search query'
                  : 'Start by creating your first password record'}
              </p>
              {!searchQuery && (
                <Button 
                  onClick={() => navigate('/records/create')}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  Create Record
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredRecords.map((record) => (
            <Card key={record.id} className="bg-slate-800 border-slate-700 hover:bg-slate-800/80 transition-colors">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-white text-base truncate">{record.title}</CardTitle>
                    <div className="space-y-1 text-slate-400">
                      <div className="text-xs">
                        Modified {new Date(record.lastModified).toLocaleDateString()}
                      </div>
                      {record.labels.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {record.labels.map((labelId: string) => {
                            const label = labels.find(l => l.id === labelId)
                            return label ? (
                              <span
                                key={labelId}
                                className="inline-flex items-center px-2 py-0.5 rounded-full text-xs"
                                style={{ backgroundColor: label.color + '20', color: label.color }}
                              >
                                {label.name}
                              </span>
                            ) : null
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex space-x-1 ml-3">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => handleView(record.id)}
                      className="text-slate-400 hover:text-white hover:bg-slate-700 h-8 w-8"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => navigate(`/records/edit/${record.id}`)}
                      className="text-slate-400 hover:text-white hover:bg-slate-700 h-8 w-8"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteRecord(record.id)}
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

      {/* View Dialog */}
      <Dialog
        open={showViewDialog}
        onClose={() => setShowViewDialog(false)}
        title="View Record"
      >
        {viewingRecord && (
          <div className="space-y-4">
            <div>
              <h3 className="font-medium text-lg text-white">{viewingRecord.title}</h3>
              <p className="text-sm text-slate-400">
                Last modified: {new Date(viewingRecord.last_modified || viewingRecord.lastModified).toLocaleDateString()}
              </p>
            </div>

            <div className="space-y-3">
              {viewingRecord.templateDetail && viewingRecord.templateDetail.fields ? (
                viewingRecord.templateDetail.fields.map((field: any) => {
                  // Handle array structure: fields is [{id: 'xxx', name: 'yyy', value: 'zzz'}, ...]
                  let fieldValue: any
                  
                  if (Array.isArray(viewingRecord.fields)) {
                    const fieldData = viewingRecord.fields.find((f: any) => f.id === field.id)
                    fieldValue = fieldData?.value || ''
                  } else {
                    fieldValue = viewingRecord.fields[field.id]
                  }
                  
                  const stringValue = typeof fieldValue === 'string' ? fieldValue :
                                    typeof fieldValue === 'object' ? JSON.stringify(fieldValue) :
                                    String(fieldValue || '')
                  
                  return (
                    <div key={field.id} className="space-y-1">
                      <label className="text-sm font-medium text-slate-200">{field.name}</label>
                      <div className="flex items-center space-x-2">
                        <Input
                          type={field.type === 'password' ? (showPasswords[field.id] ? 'text' : 'password') : 'text'}
                          value={stringValue}
                          readOnly
                          className="bg-slate-700 border-slate-600 text-white"
                        />
                        {field.type === 'password' && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => togglePasswordVisibility(field.id)}
                            className="text-slate-400 hover:text-white"
                          >
                            {showPasswords[field.id] ? <Eye className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </Button>
                        )}
                      </div>
                    </div>
                  )
                })
              ) : (
                <div className="text-sm text-slate-400">
                  No template details or fields available
                </div>
              )}
            </div>

            {viewingRecord.labels && viewingRecord.labels.length > 0 && (
              <div>
                <label className="text-sm font-medium text-slate-200">Labels</label>
                <div className="flex flex-wrap gap-1 mt-1">
                  {viewingRecord.labels.map((labelId: string) => {
                    const label = labels.find(l => l.id === labelId)
                    return label ? (
                      <span
                        key={labelId}
                        className="inline-flex items-center px-2 py-1 rounded-full text-xs"
                        style={{ backgroundColor: label.color + '20', color: label.color }}
                      >
                        {label.name}
                      </span>
                    ) : null
                  })}
                </div>
              </div>
            )}

            <DialogFooter>
              <Button 
                onClick={() => setShowViewDialog(false)}
                className="bg-slate-700 hover:bg-slate-600 text-white"
              >
                Close
              </Button>
            </DialogFooter>
          </div>
        )}
      </Dialog>
    </div>
  )
}