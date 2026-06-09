import axios from 'axios';
import { clearStoredAuth, getStoredAuth } from '../utils/authStorage';

const API = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to attach JWT Token
API.interceptors.request.use(
  (config) => {
    const storedAuth = getStoredAuth();

    if (storedAuth.valid) {
      config.headers.Authorization = `Bearer ${storedAuth.token}`;
    } else {
      clearStoredAuth();
      delete config.headers.Authorization;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle 401 unauthorized errors
API.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Clear auth tokens and sync state
      clearStoredAuth();
      
      // Redirect to login if we are not already there
      if (!window.location.pathname.endsWith('/login')) {
        window.location.href = '/login?expired=true';
      }
    }
    return Promise.reject(error);
  }
);

export default API;
