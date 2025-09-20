'use client';

import React, { createContext, useContext, ReactNode, useState, useEffect } from 'react';
import { User } from '@/types/auth';

interface Auth0ContextType {
  user: User | null;
  isLoading: boolean;
  logout: () => void;
}

const Auth0Context = createContext<Auth0ContextType | undefined>(undefined);

export function Auth0Provider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check for existing session on mount
    const checkSession = async () => {
      try {
        const response = await fetch('/api/auth/me');
        if (response.ok) {
          const userData = await response.json();
          setUser(userData);
          
          // Redirect to complete profile if user doesn't have institution
          if (userData && !userData.institution && window.location.pathname !== '/complete-profile') {
            window.location.href = '/complete-profile';
          }
        }
      } catch (error) {
        console.error('Session check error:', error);
      } finally {
        setIsLoading(false);
      }
    };

    checkSession();
  }, []);

  // Listen for auth state changes (e.g., after Google OAuth)
  useEffect(() => {
    const checkSession = async () => {
      try {
        const response = await fetch('/api/auth/me');
        if (response.ok) {
          const userData = await response.json();
          setUser(userData);
          
          // Redirect to complete profile if user doesn't have institution
          if (userData && !userData.institution && window.location.pathname !== '/complete-profile') {
            window.location.href = '/complete-profile';
          }
        }
      } catch (error) {
        console.error('Session check error:', error);
      }
    };

    const handleStorageChange = () => {
      checkSession();
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const logout = () => {
    // Clear local state immediately
    setUser(null);
    // Redirect to Auth0 logout endpoint
    window.location.href = '/api/auth/logout';
  };

  return (
    <Auth0Context.Provider value={{ user, isLoading, logout }}>
      {children}
    </Auth0Context.Provider>
  );
}

export function useAuth0() {
  const context = useContext(Auth0Context);
  if (context === undefined) {
    throw new Error('useAuth0 must be used within an Auth0Provider');
  }
  return context;
}
