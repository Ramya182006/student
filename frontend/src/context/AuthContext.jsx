import React, { createContext, useState, useEffect } from 'react';
import authService from '../services/authService';
import { buildStoredUser, clearStoredAuth, getStoredAuth } from '../utils/authStorage';

export const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  // Initialize Auth state from localStorage
  useEffect(() => {
    const storedAuth = getStoredAuth();

    if (storedAuth.valid) {
      setToken(storedAuth.token);
      setUser(storedAuth.user);
    } else {
      clearStoredAuth();
    }
    setLoading(false);
  }, []);

  const login = async (email, password, rememberMe = false) => {
    setLoading(true);
    try {
      const data = await authService.login(email, password);
      
      const nextUser = buildStoredUser(data);

      setToken(data.token);
      setUser(nextUser);

      // Save to localStorage
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(nextUser));

      if (rememberMe) {
        localStorage.setItem('remembered_email', email);
      } else {
        localStorage.removeItem('remembered_email');
      }

      return data;
    } finally {
      setLoading(false);
    }
  };

  const register = async (userData) => {
    setLoading(true);
    try {
      const data = await authService.register(userData);
      
      const nextUser = buildStoredUser(data);

      setToken(data.token);
      setUser(nextUser);

      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(nextUser));

      return data;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    clearStoredAuth();
    window.location.href = '/login';
  };

  const value = {
    user,
    token,
    loading,
    login,
    register,
    logout,
    isAuthenticated: !!token,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
