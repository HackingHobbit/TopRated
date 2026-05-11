import Link from 'next/link';
import styles from './page.module.css';

export default function Login() {
  return (
    <div className={`container ${styles.container}`}>
      <div className={`glass-panel ${styles.loginCard}`}>
        <h1 className={styles.title}>Welcome Back</h1>
        <p className={styles.subtitle}>Sign in to your Top Rated account</p>

        <form className={styles.form}>
          <div className={styles.inputGroup}>
            <label htmlFor="email">Email Address</label>
            <input type="email" id="email" placeholder="you@example.com" />
          </div>
          <div className={styles.inputGroup}>
            <label htmlFor="password">Password</label>
            <input type="password" id="password" placeholder="••••••••" />
          </div>
          <Link href="/account" className={`btn-primary ${styles.submitBtn}`}>
            Sign In
          </Link>
        </form>

        <div className={styles.footer}>
          <p>Don&apos;t have an account? <Link href="/login" className={styles.link}>Sign up</Link></p>
        </div>
      </div>
    </div>
  );
}
