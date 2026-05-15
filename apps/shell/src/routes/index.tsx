import { Routes, Route, Navigate } from 'react-router-dom';
import { ProtectedRoute, RoleRoute } from './Guards';
import { ROLES } from '../auth';
import { LoginPage } from '../pages/LoginPage';
import { DashboardPage } from '../pages/DashboardPage';
import { ModulesPage } from '../pages/ModulesPage';
import { PlaceholderPage } from '../pages/PlaceholderPage';

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route element={<ProtectedRoute />}>
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/modules" element={<ModulesPage />} />

        <Route element={<RoleRoute allowed={[ROLES.ADMIN]} />}>
          <Route path="/admin/home" element={<PlaceholderPage title="Admin Home" />} />
        </Route>
        <Route element={<RoleRoute allowed={[ROLES.CRO_MANAGER]} />}>
          <Route path="/cro/home" element={<PlaceholderPage title="CRO Manager Home" />} />
        </Route>
        <Route element={<RoleRoute allowed={[ROLES.SITE_COORDINATOR]} />}>
          <Route path="/site/home" element={<PlaceholderPage title="Site Coordinator Home" />} />
        </Route>
        <Route element={<RoleRoute allowed={[ROLES.DATA_MANAGER]} />}>
          <Route path="/data/home" element={<PlaceholderPage title="Data Manager Home" />} />
        </Route>
        <Route element={<RoleRoute allowed={[ROLES.MONITOR]} />}>
          <Route path="/monitor/home" element={<PlaceholderPage title="Monitor Home" />} />
        </Route>
        <Route element={<RoleRoute allowed={[ROLES.AUDITOR]} />}>
          <Route path="/audit/home" element={<PlaceholderPage title="Auditor Home" />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
