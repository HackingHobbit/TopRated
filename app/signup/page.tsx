'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import loginStyles from '../login/page.module.css';

export default function Signup() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pendingVerification, setPendingVerification] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { signUp, authMode } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }

    setIsSubmitting(true);
    const result = await signUp(email, password, name);
    setIsSubmitting(false);

    if (!result.ok) {
      setError(result.error ?? 'Sign up failed.');
      return;
    }

    if (authMode === 'supabase') {
      // Email verification is on by default in new Supabase projects.
      // Show a confirmation screen instead of routing to /account.
      setPendingVerification(true);
    } else {
      router.push('/account');
    }
  };

  if (pendingVerification) {
    return (
      <div className={`container ${loginStyles.container}`}>
        <div className={`glass-panel ${loginStyles.loginCard}`}>
          <h1 className={loginStyles.title}>Check Your Email</h1>
          <p className={loginStyles.subtitle}>
            We sent a confirmation link to <strong>{email}</strong>. Click it
            to finish creating your account, then come back and sign in.
          </p>
          <div className={loginStyles.footer}>
            <Link href="/login" className={loginStyles.link}>
              Back to sign in
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`container ${loginStyles.container}`}>
      <div className={`glass-panel ${loginStyles.loginCard}`}>
        <h1 className={loginStyles.title}>Create Your Account</h1>
        <p className={loginStyles.subtitle}>
          Join Top Rated to track your orders, save favorites, and earn
          loyalty points on every purchase.
        </p>

        {authMode === 'mock' && (
          <p className={loginStyles.modeNotice}>
            Demo mode — Supabase Auth isn&apos;t configured yet, so this
            creates a temporary local session only.
          </p>
        )}

        <form className={loginStyles.form} onSubmit={handleSubmit}>
          <div className={loginStyles.inputGroup}>
            <label htmlFor="name">Full Name</label>
            <input
              id="name"
              name="name"
              type="text"
              autoComplete="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div className={loginStyles.inputGroup}>
            <label htmlFor="email">Email Address</label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className={loginStyles.inputGroup}>
            <label htmlFor="password">Password</label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <div className={loginStyles.inputGroup}>
            <label htmlFor="confirm">Confirm Password</label>
            <input
              id="confirm"
              name="confirm"
              type="password"
              autoComplete="new-password"
              minLength={6}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
            />
          </div>

          {error && <p className={loginStyles.errorBox}>{error}</p>}

          <button
            type="submit"
            className={`btn-primary ${loginStyles.submitBtn}`}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Creating account…' : 'Create Account'}
          </button>
        </form>

        <div className={loginStyles.footer}>
          <p>
            Already have an account?{' '}
            <Link href="/login" className={loginStyles.link}>
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
