import { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { NavLink, useLocation } from 'react-router-dom'
import {
  Key,
  FileText,
  Tag,
  Settings,
  Lock,
  Plus,
  ExternalLink,
} from 'lucide-react'
import { useAuthStore } from '@/store/auth-store'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'
import * as browser from 'webextension-polyfill'

interface LayoutProps {
  children: ReactNode
}

export function Layout({ children }: LayoutProps) {
  const { t, ready } = useTranslation()
  const location = useLocation()
  const { lock } = useAuthStore()

  const handleFloatingWindowClick = async () => {
    try {
      await browser.windows.create({
        url: browser.runtime.getURL('popup.html'),
        type: 'popup',
        width: 400,
        height: 600,
        focused: true
      })
    } catch (error) {
      console.error('Failed to create floating window:', error)
    }
  }

  const navigation = [
    { name: ready ? t('navigation.records') : 'Records', href: '/records', icon: Key },
    { name: ready ? t('navigation.templates') : 'Templates', href: '/templates', icon: FileText },
    { name: ready ? t('navigation.labels') : 'Labels', href: '/labels', icon: Tag },
    { name: ready ? t('navigation.settings') : 'Settings', href: '/settings', icon: Settings },
  ]

  const getCurrentPageName = () => {
    const currentNav = navigation.find(nav => nav.href === location.pathname)
    return currentNav?.name || (ready ? t('navigation.records') : 'Records')
  }

  const showCreateButton = () => {
    return ['/records', '/templates', '/labels'].includes(location.pathname)
  }

  const getCreatePath = () => {
    switch (location.pathname) {
      case '/records':
        return '/records/create'
      case '/templates':
        return '/templates/create'
      case '/labels':
        return '/labels/create'
      default:
        return '/records/create'
    }
  }

  return (
    <div className="flex flex-col h-screen bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
      {/* Top Header */}
      <div className="flex items-center justify-between p-4 bg-slate-100 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700">
        <div className="flex items-center space-x-3">
          <Lock className="h-6 w-6 text-blue-500 dark:text-blue-400" />
          <h1 className="text-xl font-semibold">{getCurrentPageName()}</h1>
        </div>
        
        <div className="flex items-center space-x-2">
          {showCreateButton() && (
            <NavLink to={getCreatePath()}>
              <Button 
                size="sm" 
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                <Plus className="h-4 w-4 mr-1" />
                {ready ? t('common.create') : 'Create'}
              </Button>
            </NavLink>
          )}
          
          <div className="flex items-center space-x-1">
            <Button
              variant="ghost"
              size="icon"
              className="text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-700"
              onClick={handleFloatingWindowClick}
              title={t('layout.openFloatingWindow', 'Open floating window')}
            >
              <ExternalLink className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-700"
              onClick={lock}>
              <Lock className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Top Tab Navigation */}
      <div className="flex bg-slate-100 dark:bg-slate-800/30 border-b border-slate-200 dark:border-slate-700">
        {navigation.map((item) => {
          const Icon = item.icon
          const isActive = location.pathname === item.href ||
                          (item.href === '/records' && location.pathname.startsWith('/records'))
          
          return (
            <NavLink
              key={item.name}
              to={item.href}
              className={cn(
                "flex-1 flex items-center justify-center px-1 py-3 text-xs font-medium transition-all duration-200 border-b-2",
                isActive
                  ? "text-blue-600 dark:text-blue-400 border-blue-500 dark:border-blue-400 bg-slate-200 dark:bg-slate-800/50"
                  : "text-slate-500 dark:text-slate-400 border-transparent hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800/30"
              )}
            >
              <Icon className="h-3 w-3 mr-1" />
              <span className="truncate">{item.name}</span>
            </NavLink>
          )
        })}
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden">
        <main className="h-full overflow-y-auto bg-white dark:bg-slate-900">
          <div className="max-w-4xl mx-auto p-4">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}