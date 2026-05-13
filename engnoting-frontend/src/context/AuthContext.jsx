import { createContext, useContext, useState, useEffect } from 'react';
import * as authApi from '../api/auth.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    authApi.refresh()
      .then(data => { if (data) setUser({ email: '' }); })
      .finally(() => setLoading(false));
  }, []);

  const login = async (email, password) => {
    await authApi.login(email, password);
    setUser({ email });
  };

  const register = async (email, password) => {
    await authApi.register(email, password);
    await authApi.login(email, password);
    setUser({ email });
  };

  const logout = async () => {
    await authApi.logout();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
