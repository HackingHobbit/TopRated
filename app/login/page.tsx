'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import styles from './page.module.css';

// useSearchParams() forces this route to opt out of static prerendering
// unless we wrap it in a Suspense boundary. The boundary's fallback is
// what renders during the build's static pass.
export default function LoginPage() {
  return (
    <Suspense fallback={<LoginShell title="Sign In" />}>
      <LoginForm />
    </Suspense>
  );
}

function LoginShell({
  title,
  children,
}: {
  title: string;
  children?: React.ReactNode;
}) {
  return (
    <div className={`container ${styles.container}`}>
      <div className={`glass-panel ${styles.loginCard}`}>
        <h1 className={styles.title}>{title}</h1>
        {children ?? (
          <p className={styles.subtitle}>Loading…</p>
        )}
      </div>
    </div>
  );
}

function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { signIn, authMode } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!email || !password) return;
    setIsSubmitting(true);
    const result = await signIn(email, password);
    setIsSubmitting(false);
    if (!result.ok) {
      setError(result.error ?? 'Sign in failed.');
      return;
    }
    // Honor ?redirect= so admin-gated routes can bounce back to where they
    // came from after a successful login.
    const dest = searchParams.get('redirect') || '/account';
    router.push(dest);
  };

  return (
    <div className={`container ${styles.container}`}>
      <div className={`glass-panel ${styles.loginCard}`}>
        <h1 className={styles.title}>Welcome Back</h1>
        <p className={styles.subtitle}>Sign in to your Top Rated account</p>

        {authMode === 'mock' && (
          <p className={styles.modeNotice}>
            Demo mode — Supabase Auth isn&apos;t configured yet, so any
            email/password combo is accepted. See <code>SUPABASE_SETUP.md</code>{' '}
            to wire it up.
          </p>
        )}

        <form className={styles.form} onSubmit={handleSubmit}>
          <div className={styles.inputGroup}>
            <label htmlFor="email">Email Address</label>
            <input
              type="email"
              id="email"
              name="email"
              autoComplete="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className={styles.inputGroup}>
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              name="password"
              autoComplete="current-password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={authMode === 'supabase' ? 6 : 1}
            />
          </div>

          {error && <p className={styles.errorBox}>{error}</p>}

          <button
            type="submit"
            className={`btn-primary ${styles.submitBtn}`}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Signing in…' : 'Sign In'}
          </button>
        </form>

        <div className={styles.footer}>
          <p>
            New to Top Rated?{' '}
            <Link href="/signup" className={styles.link}>
              Create an account
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
