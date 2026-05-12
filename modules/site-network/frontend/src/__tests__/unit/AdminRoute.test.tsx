import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { AdminRoute } from '../../components/AdminRoute';

// Mock useAuth so we control auth state without Apollo
vi.mock('../../contexts/AuthContext', () => ({
  useAuth: vi.fn(),
}));

import { useAuth } from '../../contexts/AuthContext';
const mockUseAuth = vi.mocked(useAuth);

function renderWithRouter(ui: React.ReactElement, initialPath = '/admin/dashboard') {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route path="/login" element={<div>Login Page</div>} />
        <Route path="/viewer/dashboard" element={<div>Viewer Dashboard</div>} />
        <Route path="/admin/dashboard" element={ui} />
      </Routes>
    </MemoryRouter>
  );
}

describe('AdminRoute', () => {
  it('shows loading spinner while checking auth', () => {
    mockUseAuth.mockReturnValue({ isLoggedIn: false, isChecking: true, role: null });
    renderWithRouter(<AdminRoute><div>Admin Content</div></AdminRoute>);
    // CircularProgress renders — no redirect yet
    expect(screen.queryByText('Admin Content')).not.toBeInTheDocument();
    expect(screen.queryByText('Login Page')).not.toBeInTheDocument();
  });

  it('redirects to /login when not logged in', () => {
    mockUseAuth.mockReturnValue({ isLoggedIn: false, isChecking: false, role: null });
    renderWithRouter(<AdminRoute><div>Admin Content</div></AdminRoute>);
    expect(screen.getByText('Login Page')).toBeInTheDocument();
  });

  it('redirects to /viewer/dashboard when logged in as VIEWER', () => {
    mockUseAuth.mockReturnValue({ isLoggedIn: true, isChecking: false, role: 'VIEWER' });
    renderWithRouter(<AdminRoute><div>Admin Content</div></AdminRoute>);
    expect(screen.getByText('Viewer Dashboard')).toBeInTheDocument();
  });

  it('renders children when logged in as ADMIN', () => {
    mockUseAuth.mockReturnValue({ isLoggedIn: true, isChecking: false, role: 'ADMIN' });
    renderWithRouter(<AdminRoute><div>Admin Content</div></AdminRoute>);
    expect(screen.getByText('Admin Content')).toBeInTheDocument();
  });
});
