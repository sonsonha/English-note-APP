import { createContext, useContext, useState, useEffect } from 'react';
import * as authApi from '../api/auth.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    authApi.refresh()
      .then(data => {
        if (data) setUser({ email: '', isAdmin: data.is_admin ?? false });
      })
      .finally(() => setLoading(false));
  }, []);

  const login = async (email, password) => {
    const data = await authApi.login(email, password);
    setUser({ email, isAdmin: data.is_admin ?? false });
  };

  const register = async (email, password) => {
    await authApi.register(email, password);
    const data = await authApi.login(email, password);
    setUser({ email, isAdmin: data.is_admin ?? false });
  };

  const logout = async () => {
    await authApi.logout();
    setUser(null);
  };

  const googleLogin = async (idToken) => {
    const data = await authApi.googleLogin(idToken);
    setUser({ email: '', isAdmin: data.is_admin ?? false });
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, googleLogin }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
