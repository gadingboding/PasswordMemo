import { createRoot } from 'react-dom/client';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import './index.css';

// Import components and pages from the copied web app
import { Layout } from '@/components/Layout';
import { LockOverlay } from '@/components/LockOverlay';
import { LoginPage } from '@/pages/LoginPage';
import { DashboardPage } from '@/pages/DashboardPage';
import { RecordsPage } from '@/pages/RecordsPage';
import { CreateRecordPage } from '@/pages/CreateRecordPage';
import { EditRecordPage } from '@/pages/EditRecordPage';
import { TemplatesPage } from '@/pages/TemplatesPage';
import { CreateTemplatePage } from '@/pages/CreateTemplatePage';
import { EditTemplatePage } from '@/pages/EditTemplatePage';
import { LabelsPage } from '@/pages/LabelsPage';
import { CreateLabelPage } from '@/pages/CreateLabelPage';
import { EditLabelPage } from '@/pages/EditLabelPage';
import { SettingsPage } from '@/pages/SettingsPage';

const App = () => (
  <Router>
    <div className="min-h-screen w-full bg-white">
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/" element={<Layout><div /></Layout>}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="records" element={<RecordsPage />} />
          <Route path="records/create" element={<CreateRecordPage />} />
          <Route path="records/:id/edit" element={<EditRecordPage />} />
          <Route path="templates" element={<TemplatesPage />} />
          <Route path="templates/create" element={<CreateTemplatePage />} />
          <Route path="templates/:id/edit" element={<EditTemplatePage />} />
          <Route path="labels" element={<LabelsPage />} />
          <Route path="labels/create" element={<CreateLabelPage />} />
          <Route path="labels/:id/edit" element={<EditLabelPage />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>
      </Routes>
      <LockOverlay />
    </div>
  </Router>
);

createRoot(document.getElementById('root')!).render(<App />);