import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  type ReactNode,
} from 'react';
import { gql } from '@apollo/client';
import { useNavigate } from 'react-router-dom';
import { authClient } from '../apollo';
import type { RoleName } from './roles';

const ME_QUERY = gql`
  query Me {
    me {
      id
      email
      role
    }
  }
`;

const LOGIN_MUTATION = gql`
  mutation Login($email: String!, $password: String!) {
    login(email: $email, password: $password) {
      user {
        id
        email
        role
      }
    }
  }
`;

const LOGOUT_MUTATION = gql`
  mutation Logout {
    logout
  }
`;

interface AuthState {
  isLoggedIn: boolean;
  email: string | null;
  roles: RoleName[];
  loading: boolean;
}

interface AuthContextValue extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    isLoggedIn: false,
    email: null,
    roles: [],
    loading: true,
  });
  const navigate = useNavigate();
  const hasFetched = useRef(false);

  useEffect(() => {
    if (hasFetched.current) return;
    hasFetched.current = true;

    authClient
      .query({ query: ME_QUERY, fetchPolicy: 'network-only' })
      .then(({ data }) => {
        if (data?.me) {
          setState({
            isLoggedIn: true,
            email: data.me.email,
            roles: [data.me.role as RoleName],
            loading: false,
          });
        } else {
          setState({ isLoggedIn: false, email: null, roles: [], loading: false });
        }
      })
      .catch(() => {
        setState({ isLoggedIn: false, email: null, roles: [], loading: false });
      });
  }, []);

  const login = useCallback(
    async (email: string, password: string) => {
      const { data } = await authClient.mutate({
        mutation: LOGIN_MUTATION,
        variables: { email, password },
      });
      const user = data?.login?.user;
      if (user) {
        setState({
          isLoggedIn: true,
          email: user.email,
          roles: [user.role as RoleName],
          loading: false,
        });
        navigate('/dashboard');
      }
    },
    [navigate],
  );

  const logout = useCallback(async () => {
    await authClient.mutate({ mutation: LOGOUT_MUTATION });
    setState({ isLoggedIn: false, email: null, roles: [], loading: false });
    navigate('/login');
  }, [navigate]);

  return (
    <AuthContext.Provider value={{ ...state, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
