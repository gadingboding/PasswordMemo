import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './store/auth-store'
import { RecordsPage } from './pages/RecordsPage'
import { TemplatesPage } from './pages/TemplatesPage'
import { LabelsPage } from './pages/LabelsPage'
import { SettingsPage } from './pages/SettingsPage'
import { CreateRecordPage } from './pages/CreateRecordPage'
import { EditRecordPage } from './pages/EditRecordPage'
import { CreateTemplatePage } from './pages/CreateTemplatePage'
import { EditTemplatePage } from './pages/EditTemplatePage'
import { CreateLabelPage } from './pages/CreateLabelPage'
import { EditLabelPage } from './pages/EditLabelPage'
import { Layout } from './components/Layout'
import { LockOverlay } from './components/LockOverlay'

function App() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)

  return (
    <div className="relative">
      <Layout>
        <Routes>
          <Route path="/" element={<Navigate to="/records" replace />} />
          <Route path="/records" element={<RecordsPage />} />
          <Route path="/records/create" element={<CreateRecordPage />} />
          <Route path="/records/edit/:id" element={<EditRecordPage />} />
          <Route path="/templates" element={<TemplatesPage />} />
          <Route path="/templates/create" element={<CreateTemplatePage />} />
          <Route path="/templates/edit/:id" element={<EditTemplatePage />} />
          <Route path="/labels" element={<LabelsPage />} />
          <Route path="/labels/create" element={<CreateLabelPage />} />
          <Route path="/labels/edit/:id" element={<EditLabelPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Routes>
      </Layout>
      
      {/* Show lock overlay when not authenticated */}
      {!isAuthenticated && <LockOverlay />}
    </div>
  )
}

export default App