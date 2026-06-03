'use client';

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { getSupabaseBrowser } from '@/lib/supabase/browser';
import { supabaseConfigured } from '@/lib/supabase/env';

export interface User {
  id: string;
  name: string;
  email: string;
  loyaltyPoints: number;
  role?: 'admin' | 'customer';
}

export type AuthMode = 'supabase' | 'mock';

export interface SignInResult {
  ok: boolean;
  error?: string;
}

interface AuthContextType {
  isAuthenticated: boolean;
  user: User | null;
  isAuthReady: boolean;
  /** Indicates whether real Supabase auth is wired up or the local mock is active. */
  authMode: AuthMode;
  signIn: (email: string, password: string) => Promise<SignInResult>;
  signUp: (
    email: string,
    password: string,
    name: string
  ) => Promise<SignInResult>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);
const MOCK_STORAGE_KEY = 'mockAuth';

// Mock user record returned when running in fallback mode (no Supabase env
// vars configured). Lets the demo keep working end-to-end before you've
// finished SUPABASE_SETUP.md.
const MOCK_USER: User = {
  id: 'mock-user-123',
  name: 'John Doe',
  email: 'john.doe@example.com',
  loyaltyPoints: 1250,
  role: 'admin', // mock user gets admin so /admin is reachable in the demo
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const authMode: AuthMode = supabaseConfigured() ? 'supabase' : 'mock';
  const supabase = useMemo(() => getSupabaseBrowser(), []);

  const [user, setUser] = useState<User | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);

  // -------------------------------------------------------------------
  // Hydrate initial auth state
  // -------------------------------------------------------------------
  useEffect(() => {
    let cancelled = false;

    async function hydrate() {
      if (authMode === 'mock') {
        try {
          if (
            typeof window !== 'undefined' &&
            localStorage.getItem(MOCK_STORAGE_KEY) === 'true'
          ) {
            if (!cancelled) setUser(MOCK_USER);
          }
        } catch {
          /* localStorage throws in some embedded contexts; treat as logged out */
        }
        if (!cancelled) setIsAuthReady(true);
        return;
      }

      if (!supabase) {
        if (!cancelled) setIsAuthReady(true);
        return;
      }

      const { data } = await supabase.auth.getUser();
      if (cancelled) return;
      if (data.user) {
        setUser(await loadProfile(supabase, data.user));
      }
      setIsAuthReady(true);
    }

    hydrate();
    return () => {
      cancelled = true;
    };
  }, [authMode, supabase]);

  // -------------------------------------------------------------------
  // Listen for live auth state changes from Supabase (sign in via magic
  // link in another tab, token refresh, sign-out in another tab, etc.)
  // -------------------------------------------------------------------
  useEffect(() => {
    if (authMode !== 'supabase' || !supabase) return;
    const { data: sub } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (!session?.user) {
          setUser(null);
          return;
        }
        setUser(await loadProfile(supabase, session.user));
      }
    );
    return () => {
      sub.subscription.unsubscribe();
    };
  }, [authMode, supabase]);

  // -------------------------------------------------------------------
  // Mutators
  // -------------------------------------------------------------------
  const signIn = useCallback(
    async (email: string, password: string): Promise<SignInResult> => {
      if (authMode === 'mock') {
        if (!email) return { ok: false, error: 'Email required.' };
        const next: User = {
          ...MOCK_USER,
          email,
          name: email.split('@')[0] || 'User',
        };
        setUser(next);
        try {
          localStorage.setItem(MOCK_STORAGE_KEY, 'true');
        } catch {
          /* ignore */
        }
        return { ok: true };
      }

      if (!supabase) return { ok: false, error: 'Supabase not configured.' };
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      return error ? { ok: false, error: error.message } : { ok: true };
    },
    [authMode, supabase]
  );

  const signUp = useCallback(
    async (
      email: string,
      password: string,
      name: string
    ): Promise<SignInResult> => {
      if (authMode === 'mock') {
        return signIn(email, password);
      }
      if (!supabase) return { ok: false, error: 'Supabase not configured.' };
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { name },
          emailRedirectTo:
            typeof window !== 'undefined'
              ? `${window.location.origin}/auth/callback`
              : undefined,
        },
      });
      return error ? { ok: false, error: error.message } : { ok: true };
    },
    [authMode, supabase, signIn]
  );

  const signOut = useCallback(async () => {
    if (authMode === 'mock') {
      setUser(null);
      try {
        localStorage.removeItem(MOCK_STORAGE_KEY);
      } catch {
        /* ignore */
      }
      return;
    }
    if (!supabase) return;
    await supabase.auth.signOut();
    setUser(null);
  }, [authMode, supabase]);

  // -------------------------------------------------------------------
  return (
    <AuthContext.Provider
      value={{
        isAuthenticated: user !== null,
        user,
        isAuthReady,
        authMode,
        signIn,
        signUp,
        signOut,
      }}
    >
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

// -----------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------

async function loadProfile(
  supabase: NonNullable<ReturnType<typeof getSupabaseBrowser>>,
  authUser: { id: string; email?: string | null }
): Promise<User> {
  const { data } = await supabase
    .from('profiles')
    .select('name, loyalty_points, role')
    .eq('id', authUser.id)
    .single();

  return {
    id: authUser.id,
    email: authUser.email ?? '',
    name: data?.name ?? authUser.email?.split('@')[0] ?? 'Member',
    loyaltyPoints: data?.loyalty_points ?? 0,
    role: data?.role === 'admin' ? 'admin' : 'customer',
  };
}
