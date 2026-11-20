import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import * as authService from '../services/authService';
import { getToken } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  // "loading" is true until we know whether a saved token is still valid.
  const [loading, setLoading] = useState(Boolean(getToken()));

  // On first load: if there's a saved token, ask the server who we are.
  useEffect(() => {
    if (!getToken()) return;
    authService
      .fetchMe()
      .then(setUser)
      .catch(() => authService.logout())
      .finally(() => setLoading(false));
  }, []);

  // The API client fires this event when the server rejects our token.
  useEffect(() => {
    const onForcedLogout = () => setUser(null);
    window.addEventListener('auth:logout', onForcedLogout);
    return () => window.removeEventListener('auth:logout', onForcedLogout);
  }, []);

  const login = useCallback(async (credentials) => setUser(await authService.login(credentials)), []);
  const register = useCallback(async (details) => setUser(await authService.register(details)), []);
  const logout = useCallback(() => {
    authService.logout();
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, loading, login, register, logout, setUser }),
    [user, loading, login, register, logout]
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
