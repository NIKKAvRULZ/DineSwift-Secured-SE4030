import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import http from '../api/http';
const AuthContext = createContext(null);
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const checkAuth = useCallback(async () => {
    try {
      const { data } = await http.get('http://localhost:5001/api/auth/me');
      setUser(data.user);
      return data.user;
    } catch { setUser(null); return null; }
    finally { setLoading(false); }
  }, []);
  useEffect(() => {
    // Remove legacy credentials; never write authentication material to Web Storage.
    localStorage.removeItem('token');
    sessionStorage.removeItem('token');
    localStorage.removeItem('user');
    checkAuth();
  }, [checkAuth]);
  const login = async (email, password) => {
    try {
      const { data } = await http.post('http://localhost:5001/api/auth/login', { email, password });
      setUser(data.user);
      return data.user;
    } catch (error) { throw new Error(error.response?.data?.message || 'Login failed'); }
  };
  const register = async userData => {
    try {
      const { data } = await http.post('http://localhost:5001/api/auth/register', userData);
      setUser(data.user);
      return { success: true };
    } catch (error) { return { success: false, error: error.response?.data?.message || 'Registration failed' }; }
  };
  const logout = async () => {
    await http.post('http://localhost:5001/api/auth/logout');
    setUser(null);
  };
  if (loading) return <div>Loading...</div>;
  return <AuthContext.Provider value={{ user, isAuthenticated: Boolean(user), login, register, logout, checkAuth }}>
    {children}
  </AuthContext.Provider>;
};
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
