import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User } from '../lib/supabase';
import { signInWithToss, getTossUserKey, updateUserRole } from '../lib/auth';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  error: string | null;
  isOwner: boolean;
  switchToOwner: () => Promise<void>;
  switchToCustomer: () => Promise<void>;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 앱 시작 시 자동 로그인
  useEffect(() => {
    initAuth();
  }, []);

  async function initAuth() {
    try {
      setIsLoading(true);
      setError(null);

      // 1. 토스에서 userKey 가져오기
      const tossUserKey = await getTossUserKey();

      // 2. userKey로 로그인/회원가입
      const loggedInUser = await signInWithToss(tossUserKey);

      setUser(loggedInUser);
    } catch (err) {
      console.error('인증 실패:', err);
      setError(err instanceof Error ? err.message : '로그인 실패');
    } finally {
      setIsLoading(false);
    }
  }

  async function switchToOwner() {
    if (!user) return;

    try {
      const updatedUser = await updateUserRole(user.id, 'owner');
      setUser(updatedUser);
    } catch (err) {
      console.error('역할 변경 실패:', err);
      throw err;
    }
  }

  async function switchToCustomer() {
    if (!user) return;

    try {
      const updatedUser = await updateUserRole(user.id, 'customer');
      setUser(updatedUser);
    } catch (err) {
      console.error('역할 변경 실패:', err);
      throw err;
    }
  }

  async function refresh() {
    await initAuth();
  }

  const value: AuthContextType = {
    user,
    isLoading,
    error,
    isOwner: user?.role === 'owner',
    switchToOwner,
    switchToCustomer,
    refresh,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
