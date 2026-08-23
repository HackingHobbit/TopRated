'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { submitContactMessage } from '@/lib/supportActions';
import styles from './page.module.css';

export default function ContactPage() {
  const { user, isAuthenticated } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sent, setSent] = useState<{ isGuest: boolean } | null>(null);

  // Prefill from the account once auth state is known — doesn't fight the
  // user's typing since it only runs when isAuthenticated flips.
  useEffect(() => {
    if (isAuthenticated && user) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setName((n) => n || user.name);
      setEmail((e) => e || user.email);
    }
  }, [isAuthenticated, user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    const res = await submitContactMessage({ name, email, subject, message });
    setIsSubmitting(false);
    if (!res.ok) {
      setError(res.error ?? 'Could not send your message.');
      return;
    }
    setSent({ isGuest: Boolean(res.isGuest) });
  };

  return (
    <div className={`container ${styles.container}`}>
      <div className={`glass-panel ${styles.card}`}>
        {sent ? (
          <div className={styles.successState}>
            <h2>Message Sent</h2>
            {sent.isGuest ? (
              <p>
                Thanks — our team will review your message and follow up at{' '}
                {email}.{' '}
                <Link href="/signup" className={styles.link}>
                  Create an account
                </Link>{' '}
                to track this conversation and get replies right here next time.
              </p>
            ) : (
              <p>
                Thanks — our team will review your message and reply here. You
                can follow the conversation under{' '}
                <Link href="/account" className={styles.link}>
                  Account &rsaquo; Messages
                </Link>
                .
              </p>
            )}
          </div>
        ) : (
          <>
            <h1 className={styles.title}>Contact Us</h1>
            <p className={styles.subtitle}>
              Questions about an order, a product, or anything else — send us
              a message and our team will get back to you.
            </p>

            {!isAuthenticated && (
              <p className={styles.nudge}>
                Have an account?{' '}
                <Link href="/login?redirect=/contact">Sign in</Link> first so
                you can track this conversation and see replies right here.
              </p>
            )}

            <form className={styles.form} onSubmit={handleSubmit}>
              <div className={styles.row}>
                <div className={styles.inputGroup}>
                  <label htmlFor="contactName">Name</label>
                  <input
                    id="contactName"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>
                <div className={styles.inputGroup}>
                  <label htmlFor="contactEmail">Email</label>
                  <input
                    id="contactEmail"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className={styles.inputGroup}>
                <label htmlFor="contactSubject">Subject</label>
                <input
                  id="contactSubject"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="e.g. Question about order TR-12345"
                  required
                />
              </div>

              <div className={styles.inputGroup}>
                <label htmlFor="contactMessage">Message</label>
                <textarea
                  id="contactMessage"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  required
                />
              </div>

              {error && <p className={styles.errorBox}>{error}</p>}

              <button
                type="submit"
                className={`btn-primary ${styles.submitBtn}`}
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Sending…' : 'Send Message'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
