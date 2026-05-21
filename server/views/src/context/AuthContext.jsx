import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { api } from '../api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [authenticated, setAuthenticated] = useState(false);
  const [isDefaultPassword, setIsDefaultPassword] = useState(true);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api('/auth/status').then(r => {
      if (r?.authenticated) {
        setAuthenticated(true);
        setIsDefaultPassword(r.isDefaultPassword);
      }
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    const handler = () => {
      setAuthenticated(false);
    };
    window.addEventListener('auth:unauthorized', handler);
    return () => window.removeEventListener('auth:unauthorized', handler);
  }, []);

  const login = useCallback(async (password) => {
    const r = await api('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ password }),
    });
    if (r?.success) {
      setAuthenticated(true);
      setIsDefaultPassword(r.isDefaultPassword);
      return { success: true };
    }
    return { success: false, message: r?.message || 'Mot de passe incorrect' };
  }, []);

  const logout = useCallback(async () => {
    await api('/auth/logout', { method: 'POST' });
    setAuthenticated(false);
  }, []);

  return (
    <AuthContext.Provider value={{ authenticated, isDefaultPassword, loading, login, logout, setIsDefaultPassword }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
