import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="container" style={{ padding: '8rem 0', textAlign: 'center', minHeight: '60vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
      <h1 className="text-gradient" style={{ fontSize: '4rem', marginBottom: '1rem' }}>404</h1>
      <h2 style={{ fontSize: '2rem', marginBottom: '1.5rem', color: 'var(--text-primary)' }}>Page Not Found</h2>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem', maxWidth: '400px' }}>
        The page or product you are looking for doesn&apos;t exist or has been moved.
      </p>
      <Link href="/" className="btn-primary" style={{ padding: '1rem 2rem' }}>
        Return to Home
      </Link>
    </div>
  );
}
