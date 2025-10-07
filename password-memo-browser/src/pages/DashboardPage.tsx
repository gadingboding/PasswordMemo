import { useEffect, useState } from 'react'
import { Plus, Key, FileText, Tag, Shield } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useAuthStore } from '@/store/auth-store'
import { Button } from '@/components/ui/Button'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card'

interface DashboardStats {
  totalRecords: number
  totalTemplates: number
  totalLabels: number
  lastSync?: string
}

export function DashboardPage() {
  const { t } = useTranslation()
  const { passwordManager } = useAuthStore()
  const [stats, setStats] = useState<DashboardStats>({
    totalRecords: 0,
    totalTemplates: 0,
    totalLabels: 0
  })
  const [recentRecords, setRecentRecords] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadDashboardData = async () => {
      if (!passwordManager) return

      try {
        const [records, templates, labels] = await Promise.all([
          passwordManager.getRecordList(),
          passwordManager.getTemplateList(),
          passwordManager.getLabelList()
        ])

        setStats({
          totalRecords: records.length,
          totalTemplates: templates.length,
          totalLabels: labels.length
        })

        // Get recent records (last 5)
        const sortedRecords = records
          .sort((a, b) => new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime())
          .slice(0, 5)
        
        setRecentRecords(sortedRecords)
      } catch (error) {
        console.error('Failed to load dashboard data:', error)
      } finally {
        setLoading(false)
      }
    }

    loadDashboardData()
  }, [passwordManager])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-sm text-muted-foreground">{t('dashboard.loading')}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">{t('dashboard.title')}</h1>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          {t('dashboard.quickAddRecord')}
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('dashboard.totalRecords')}</CardTitle>
            <Key className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalRecords}</div>
            <p className="text-xs text-muted-foreground">
              {t('dashboard.totalRecordsDesc')}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('dashboard.templates')}</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalTemplates}</div>
            <p className="text-xs text-muted-foreground">
              {t('dashboard.templatesDesc')}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('dashboard.labels')}</CardTitle>
            <Tag className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalLabels}</div>
            <p className="text-xs text-muted-foreground">
              {t('dashboard.labelsDesc')}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('dashboard.security')}</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{t('dashboard.securityLevelHigh')}</div>
            <p className="text-xs text-muted-foreground">
              {t('dashboard.securityDesc')}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Records */}
      <Card>
        <CardHeader>
          <CardTitle>{t('dashboard.recentRecords')}</CardTitle>
          <CardDescription>
            {t('dashboard.recentRecordsDesc')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {recentRecords.length === 0 ? (
            <div className="text-center py-8">
              <Key className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">{t('dashboard.noRecordsYet')}</h3>
              <p className="text-muted-foreground mb-4">
                {t('dashboard.noRecordsYetDesc')}
              </p>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                {t('records.createRecord')}
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {recentRecords.map((record) => (
                <div
                  key={record.id}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50"
                >
                  <div>
                    <h4 className="font-medium">{record.title}</h4>
                    <p className="text-sm text-muted-foreground">
                      Modified {new Date(record.lastModified).toLocaleDateString()}
                    </p>
                  </div>
                  <Button variant="ghost" size="sm">
                    {t('dashboard.view')}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}