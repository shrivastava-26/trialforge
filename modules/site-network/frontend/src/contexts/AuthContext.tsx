import { createContext, useContext, ReactNode } from 'react';
import { useQuery } from '@apollo/client';
import { AuthContextValue } from '../types';
import { ME_QUERY } from '../services/authService';

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { loading, data, error } = useQuery(ME_QUERY, { fetchPolicy: 'network-only' });

  const isLoggedIn = !loading && !error && !!data?.me;
  const role = data?.me?.role ?? null;

  return (
    <AuthContext.Provider value={{ isLoggedIn, isChecking: loading, role }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
