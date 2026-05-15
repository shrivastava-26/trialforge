import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Routes, Route } from 'react-router-dom';
import { TestWrapper } from './helpers';

// Mock auth module
const mockAuth = {
  isLoggedIn: false,
  email: null,
  roles: [] as string[],
  loading: false,
  login: vi.fn(),
  logout: vi.fn(),
};

vi.mock('../auth', () => ({
  useAuth: () => mockAuth,
  AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  ROLES: {
    ADMIN: 'ADMIN',
    VIEWER: 'VIEWER',
    CRO_MANAGER: 'CRO_MANAGER',
    SITE_COORDINATOR: 'SITE_COORDINATOR',
    DATA_MANAGER: 'DATA_MANAGER',
    MONITOR: 'MONITOR',
    AUDITOR: 'AUDITOR',
  },
}));

// Must import after mock
import { ProtectedRoute, RoleRoute } from '../routes/Guards';

describe('ProtectedRoute', () => {
  beforeEach(() => {
    mockAuth.isLoggedIn = false;
    mockAuth.roles = [];
    mockAuth.loading = false;
  });

  it('redirects to /login when not logged in', () => {
    render(
      <TestWrapper initialEntries={['/secret']}>
        <Routes>
          <Route element={<ProtectedRoute />}>
            <Route path="/secret" element={<div>Secret</div>} />
          </Route>
          <Route path="/login" element={<div>Login Page</div>} />
        </Routes>
      </TestWrapper>,
    );
    expect(screen.getByText('Login Page')).toBeInTheDocument();
    expect(screen.queryByText('Secret')).not.toBeInTheDocument();
  });

  it('renders child when logged in', () => {
    mockAuth.isLoggedIn = true;
    render(
      <TestWrapper initialEntries={['/secret']}>
        <Routes>
          <Route element={<ProtectedRoute />}>
            <Route path="/secret" element={<div>Secret</div>} />
          </Route>
        </Routes>
      </TestWrapper>,
    );
    expect(screen.getByText('Secret')).toBeInTheDocument();
  });
});

describe('RoleRoute', () => {
  beforeEach(() => {
    mockAuth.isLoggedIn = true;
    mockAuth.loading = false;
  });

  it('blocks wrong roles', () => {
    mockAuth.roles = ['VIEWER'];
    render(
      <TestWrapper initialEntries={['/admin']}>
        <Routes>
          <Route element={<RoleRoute allowed={['ADMIN']} />}>
            <Route path="/admin" element={<div>Admin</div>} />
          </Route>
          <Route path="/dashboard" element={<div>Dashboard</div>} />
        </Routes>
      </TestWrapper>,
    );
    expect(screen.queryByText('Admin')).not.toBeInTheDocument();
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
  });

  it('allows ADMIN access to any role route', () => {
    mockAuth.roles = ['ADMIN'];
    render(
      <TestWrapper initialEntries={['/monitor']}>
        <Routes>
          <Route element={<RoleRoute allowed={['MONITOR']} />}>
            <Route path="/monitor" element={<div>Monitor</div>} />
          </Route>
        </Routes>
      </TestWrapper>,
    );
    expect(screen.getByText('Monitor')).toBeInTheDocument();
  });
});
