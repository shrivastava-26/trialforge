import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { ProtectedRoute } from '../../components/ProtectedRoute';

vi.mock('../../contexts/AuthContext', () => ({
  useAuth: vi.fn(),
}));

import { useAuth } from '../../contexts/AuthContext';
const mockUseAuth = vi.mocked(useAuth);

function renderWithRouter(ui: React.ReactElement) {
  return render(
    <MemoryRouter initialEntries={['/viewer/dashboard']}>
      <Routes>
        <Route path="/login" element={<div>Login Page</div>} />
        <Route path="/viewer/dashboard" element={ui} />
      </Routes>
    </MemoryRouter>
  );
}

describe('ProtectedRoute', () => {
  it('shows loading spinner while checking auth', () => {
    mockUseAuth.mockReturnValue({ isLoggedIn: false, isChecking: true, role: null });
    renderWithRouter(<ProtectedRoute><div>Protected Content</div></ProtectedRoute>);
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
    expect(screen.queryByText('Login Page')).not.toBeInTheDocument();
  });

  it('redirects to /login when not logged in', () => {
    mockUseAuth.mockReturnValue({ isLoggedIn: false, isChecking: false, role: null });
    renderWithRouter(<ProtectedRoute><div>Protected Content</div></ProtectedRoute>);
    expect(screen.getByText('Login Page')).toBeInTheDocument();
  });

  it('renders children when logged in', () => {
    mockUseAuth.mockReturnValue({ isLoggedIn: true, isChecking: false, role: 'VIEWER' });
    renderWithRouter(<ProtectedRoute><div>Protected Content</div></ProtectedRoute>);
    expect(screen.getByText('Protected Content')).toBeInTheDocument();
  });
});
