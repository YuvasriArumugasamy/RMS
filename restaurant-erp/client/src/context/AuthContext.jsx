import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import axios from 'axios';

const AuthContext = createContext(null);

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// Axios instance with base URL
export const api = axios.create({ baseURL: API_URL });

// Attach token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('rms_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Global response error interceptor
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const message = error.response?.data?.message || error.message;

    // Auto-logout on 401 (token expired)
    if (status === 401) {
      localStorage.removeItem('rms_token');
      // Reload to trigger session restore → redirect to login
      if (window.location.pathname !== '/login' && window.location.pathname !== '/welcome') {
        window.location.href = '/login';
      }
    }

    // Log server errors
    if (status >= 500) {
      console.error('🔴 Server Error:', message);
    }

    return Promise.reject(error);
  }
);

// Role-based page permissions
const ROLE_PERMISSIONS = {
  Admin:    ['Dashboard', 'Menu Management', 'Table Management', 'Order Management', 'Kitchen Management',
             'Inventory Management', 'Billing', 'Staff Management', 'Customer Management',
             'Reports & Analytics', 'Settings', 'AI Operational Hub', 'Digital Twin'],
  Manager:  ['Dashboard', 'Menu Management', 'Table Management', 'Order Management', 'Kitchen Management',
             'Inventory Management', 'Billing', 'Customer Management', 'Reports & Analytics',
             'AI Operational Hub', 'Digital Twin'],
  Chef:     ['Kitchen Management', 'AI Operational Hub'],
  Waiter:   ['Table Management', 'Order Management'],
  Cashier:  ['Billing'],
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [permissions, setPermissions] = useState([]);
  const [loading, setLoading] = useState(true); // loading while checking token

  // On app start: try to restore session from stored token
  useEffect(() => {
    const restoreSession = async () => {
      const token = localStorage.getItem('rms_token');
      if (!token) { setLoading(false); return; }

      try {
        const { data } = await api.get('/auth/me');
        if (data.success) {
          setUser(data.user);
          setPermissions(ROLE_PERMISSIONS[data.user.role] || []);
        }
      } catch {
        // Token expired or invalid — clear it
        localStorage.removeItem('rms_token');
      } finally {
        setLoading(false);
      }
    };

    restoreSession();
  }, []);

  const login = useCallback(async (username, password) => {
    const { data } = await api.post('/auth/login', { username, password });
    if (data.success) {
      localStorage.setItem('rms_token', data.token);
      setUser(data.user);
      setPermissions(ROLE_PERMISSIONS[data.user.role] || []);
    }
    return data;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('rms_token');
    setUser(null);
    setPermissions([]);
  }, []);

  return (
    <AuthContext.Provider value={{ user, login, logout, permissions, loading, api }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
