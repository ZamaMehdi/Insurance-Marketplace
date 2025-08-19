import React, { createContext, useContext, useState, useEffect } from 'react';
import apiService from '../services/api';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Check if user is already authenticated on app start
  useEffect(() => {
    const checkAuthStatus = async () => {
      try {
        if (apiService.isAuthenticated()) {
          const userData = await apiService.getCurrentUser();
          // Handle both response formats: {success: true, user: {...}} or just {...}
          const user = userData.success ? userData.user : userData;
          setUser(user);
        }
      } catch (error) {
        console.error('Error checking auth status:', error);
        // Clear invalid token
        apiService.removeAuthToken();
      } finally {
        setLoading(false);
      }
    };

    checkAuthStatus();
  }, []);

  // Listen for logout events from API service
  useEffect(() => {
    const handleLogout = (event) => {
      setUser(null);
      apiService.removeAuthToken();
    };

    window.addEventListener('auth:logout', handleLogout);
    return () => window.removeEventListener('auth:logout', handleLogout);
  }, []);

  // Register new user
  const register = async (userData) => {
    try {
      const result = await apiService.register(userData);
      if (result.success) {
        // Handle both response formats: {success: true, user: {...}} or just {...}
        const user = result.success ? result.user : result;
        setUser(user);
        return result;
      } else {
        return result;
      }
    } catch (error) {
      console.error('Registration error:', error);
      
      // Provide more specific error messages
      let errorMessage = 'Registration failed. Please try again.';
      
      if (error.message.includes('already exists')) {
        errorMessage = 'An account with this email already exists. Please try logging in instead.';
      } else if (error.message.includes('validation')) {
        errorMessage = 'Please check your input and try again.';
      } else if (error.message.includes('network') || error.message.includes('fetch')) {
        errorMessage = 'Network error. Please check your connection and try again.';
      }
      
      return { success: false, message: errorMessage };
    }
  };

  // Login user
  const login = async (email, password) => {
    try {
      const result = await apiService.login(email, password);
      if (result.success) {
        // Handle both response formats: {success: true, user: {...}} or just {...}
        const user = result.success ? result.user : result;
        setUser(user);
        return result;
      } else {
        return result;
      }
    } catch (error) {
      console.error('Login error:', error);
      
      // Provide more specific error messages
      let errorMessage = 'Login failed. Please try again.';
      
      if (error.message.includes('Invalid credentials') || error.message.includes('not found')) {
        errorMessage = 'Invalid email or password. Please try again.';
      } else if (error.message.includes('validation')) {
        errorMessage = 'Please check your input and try again.';
      } else if (error.message.includes('network') || error.message.includes('fetch')) {
        errorMessage = 'Network error. Please check your connection and try again.';
      }
      
      return { success: false, message: errorMessage };
    }
  };

  // Logout user
  const logout = async () => {
    try {
      await apiService.logout();
      setUser(null);
      return { success: true };
    } catch (error) {
      console.error('Logout error:', error);
      // Force logout even if API call fails
      setUser(null);
      return { success: true };
    }
  };

  // Update user profile
  const updateUser = async (updates) => {
    try {
      const result = await apiService.updateUserProfile(updates);
      if (result.success) {
        setUser(result.user);
      }
      return result;
    } catch (error) {
      console.error('Update user error:', error);
      return { success: false, message: error.message || 'Failed to update user profile' };
    }
  };

  // Check if user is authenticated
  const isAuthenticated = () => {
    return apiService.isAuthenticated() && user !== null;
  };

  // Get user role
  const getUserRole = () => {
    return user?.role || null;
  };

  const value = {
    user,
    loading,
    register,
    login,
    logout,
    updateUser,
    isAuthenticated,
    getUserRole
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

