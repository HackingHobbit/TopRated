"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';

export interface User {
  id: string;
  name: string;
  email: string;
  loyaltyPoints: number;
}

interface AuthContextType {
  isAuthenticated: boolean;
  user: User | null;
  login: (email: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<User | null>(null);

  // Check mock local storage on mount
  useEffect(() => {
    const storedAuth = localStorage.getItem('mockAuth');
    if (storedAuth === 'true') {
      setIsAuthenticated(true);
      setUser({
        id: 'mock-user-123',
        name: 'John Doe',
        email: 'john.doe@example.com',
        loyaltyPoints: 1250
      });
    }
  }, []);

  const login = (email: string) => {
    // Mock login logic
    setIsAuthenticated(true);
    setUser({
      id: 'mock-user-123',
      name: email.split('@')[0] || 'User',
      email: email,
      loyaltyPoints: 1250
    });
    localStorage.setItem('mockAuth', 'true');
  };

  const logout = () => {
    setIsAuthenticated(false);
    setUser(null);
    localStorage.removeItem('mockAuth');
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
