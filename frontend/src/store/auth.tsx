import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { AuthSession, User, UserRole } from '../types';
import { authService } from '../services/auth';
import {
  clearSession,
  getSession,
  saveSession,
} from './session';

interface AuthContextValue {
  session: AuthSession | null;
  user: (Pick<User, 'id' | 'email' | 'name' | 'role'> & Partial<User>) | null;
  role: UserRole | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  canOperate: boolean;
  ready: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(() => getSession());
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const current = getSession();
    if (!current) {
      setReady(true);
      return;
    }

    let cancelled = false;
    authService
      .me()
      .then((profile) => {
        if (cancelled) return;
        const next: AuthSession = {
          ...current,
          user: {
            id: profile.id,
            email: profile.email,
            name: profile.name,
            role: profile.role,
          },
        };
        saveSession(next);
        setSession(next);
      })
      .catch(() => {
        if (cancelled) return;
        clearSession();
        setSession(null);
      })
      .finally(() => {
        if (!cancelled) setReady(true);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const next = await authService.login(email, password);
    saveSession(next);
    setSession(next);
  }, []);

  const logout = useCallback(() => {
    clearSession();
    setSession(null);
  }, []);

  const value = useMemo<AuthContextValue>(() => {
    const role = session?.user.role || null;
    return {
      session,
      user: session?.user || null,
      role,
      isAuthenticated: Boolean(session?.access_token),
      isAdmin: role === 'ADMIN',
      canOperate: role === 'ADMIN' || role === 'STAFF',
      ready,
      login,
      logout,
    };
  }, [session, ready, login, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe usarse dentro de AuthProvider');
  }
  return context;
}
