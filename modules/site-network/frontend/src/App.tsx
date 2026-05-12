import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ApolloProvider } from '@apollo/client';
import { ThemeProvider, CssBaseline } from '@mui/material';
import { apolloClient } from './utils/apolloClient';
import { AuthProvider } from './contexts/AuthContext';
import { AdminRoute } from './components/AdminRoute';
import { ProtectedRoute } from './components/ProtectedRoute';
import { LoginPage } from './pages/LoginPage';

// Admin pages
import { AdminDashboardPage } from './pages/admin/DashboardPage';
import { AdminStudiesPage } from './pages/admin/StudiesPage';
import { AdminStudyDetailPage } from './pages/admin/StudyDetailPage';
import { AdminSitesPage } from './pages/admin/SitesPage';
import { AdminSiteDetailPage } from './pages/admin/SiteDetailPage';
import { AdminExaminersPage } from './pages/admin/ExaminersPage';
import { AdminExaminerDetailPage } from './pages/admin/ExaminerDetailPage';
import { AdminSearchPage } from './pages/admin/SearchPage';
import { AuditLogsPage } from './pages/admin/AuditLogsPage';
import { StudyAuditHistoryPage } from './pages/admin/StudyAuditHistoryPage';
import { SiteAuditHistoryPage } from './pages/admin/SiteAuditHistoryPage';
import { ExaminerAuditHistoryPage } from './pages/admin/ExaminerAuditHistoryPage';

// Viewer pages
import { ViewerDashboardPage } from './pages/viewer/DashboardPage';
import { ViewerStudiesPage } from './pages/viewer/StudiesPage';
import { ViewerStudyDetailPage } from './pages/viewer/StudyDetailPage';
import { ViewerSitesPage } from './pages/viewer/SitesPage';
import { ViewerSiteDetailPage } from './pages/viewer/SiteDetailPage';
import { ViewerExaminersPage } from './pages/viewer/ExaminersPage';
import { ViewerExaminerDetailPage } from './pages/viewer/ExaminerDetailPage';
import { ViewerSearchPage } from './pages/viewer/SearchPage';

import theme from './theme';

export default function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <ApolloProvider client={apolloClient}>
        <AuthProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/login" element={<LoginPage />} />

              {/* ── Admin routes ── */}
              <Route path="/admin/dashboard"        element={<AdminRoute><AdminDashboardPage /></AdminRoute>} />
              <Route path="/admin/studies"          element={<AdminRoute><AdminStudiesPage /></AdminRoute>} />
              <Route path="/admin/studies/:id"      element={<AdminRoute><AdminStudyDetailPage /></AdminRoute>} />
              <Route path="/admin/studies/:id/history" element={<AdminRoute><StudyAuditHistoryPage /></AdminRoute>} />
              <Route path="/admin/sites"            element={<AdminRoute><AdminSitesPage /></AdminRoute>} />
              <Route path="/admin/sites/:id"        element={<AdminRoute><AdminSiteDetailPage /></AdminRoute>} />
              <Route path="/admin/sites/:id/history"   element={<AdminRoute><SiteAuditHistoryPage /></AdminRoute>} />
              <Route path="/admin/examiners"        element={<AdminRoute><AdminExaminersPage /></AdminRoute>} />
              <Route path="/admin/examiners/:id"    element={<AdminRoute><AdminExaminerDetailPage /></AdminRoute>} />
              <Route path="/admin/examiners/:id/history" element={<AdminRoute><ExaminerAuditHistoryPage /></AdminRoute>} />
              <Route path="/admin/search"           element={<AdminRoute><AdminSearchPage /></AdminRoute>} />
              <Route path="/admin/audit-logs"       element={<AdminRoute><AuditLogsPage /></AdminRoute>} />

              {/* ── Viewer routes ── */}
              <Route path="/viewer/dashboard"       element={<ProtectedRoute><ViewerDashboardPage /></ProtectedRoute>} />
              <Route path="/viewer/studies"         element={<ProtectedRoute><ViewerStudiesPage /></ProtectedRoute>} />
              <Route path="/viewer/studies/:id"     element={<ProtectedRoute><ViewerStudyDetailPage /></ProtectedRoute>} />
              <Route path="/viewer/sites"           element={<ProtectedRoute><ViewerSitesPage /></ProtectedRoute>} />
              <Route path="/viewer/sites/:id"       element={<ProtectedRoute><ViewerSiteDetailPage /></ProtectedRoute>} />
              <Route path="/viewer/examiners"       element={<ProtectedRoute><ViewerExaminersPage /></ProtectedRoute>} />
              <Route path="/viewer/examiners/:id"   element={<ProtectedRoute><ViewerExaminerDetailPage /></ProtectedRoute>} />
              <Route path="/viewer/search"          element={<ProtectedRoute><ViewerSearchPage /></ProtectedRoute>} />

              {/* Legacy redirects — old flat routes go to viewer equivalents */}
              <Route path="/dashboard"    element={<Navigate to="/viewer/dashboard" replace />} />
              <Route path="/studies"      element={<Navigate to="/viewer/studies" replace />} />
              <Route path="/studies/:id"  element={<Navigate to="/viewer/studies" replace />} />
              <Route path="/sites"        element={<Navigate to="/viewer/sites" replace />} />
              <Route path="/sites/:id"    element={<Navigate to="/viewer/sites" replace />} />
              <Route path="/examiners"    element={<Navigate to="/viewer/examiners" replace />} />
              <Route path="/examiners/:id" element={<Navigate to="/viewer/examiners" replace />} />

              {/* Default — redirect to login */}
              <Route path="*" element={<Navigate to="/login" replace />} />
            </Routes>
          </BrowserRouter>
        </AuthProvider>
      </ApolloProvider>
    </ThemeProvider>
  );
}
