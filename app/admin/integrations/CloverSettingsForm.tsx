'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle2, XCircle, Loader2, FlaskConical, Radio } from 'lucide-react';
import { saveCloverSettings, testCloverConnection } from '@/lib/cloverActions';
import type { CloverStatus, SaveCloverInput } from '@/lib/clover/types';
import styles from './integrations.module.css';

export default function CloverSettingsForm({ status }: { status: CloverStatus }) {
  const router = useRouter();
  const [mode, setMode] = useState(status.mode);
  const [environment, setEnvironment] = useState(status.environment);
  const [merchantId, setMerchantId] = useState(status.merchantId);
  const [ecommPublicKey, setEcommPublicKey] = useState(status.ecommPublicKey);
  const [apiToken, setApiToken] = useState('');
  const [ecommPrivateKey, setEcommPrivateKey] = useState('');
  const [saving, startSave] = useTransition();
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [saved, setSaved] = useState<string | null>(null);

  const input = (): SaveCloverInput => ({
    mode,
    environment,
    merchantId: merchantId.trim(),
    ecommPublicKey: ecommPublicKey.trim(),
    apiToken: apiToken.trim() || undefined,
    ecommPrivateKey: ecommPrivateKey.trim() || undefined,
  });

  const onSave = () => {
    setSaved(null);
    startSave(async () => {
      const res = await saveCloverSettings(input());
      setSaved(res.ok ? 'Saved.' : `Save failed: ${res.error}`);
      if (res.ok) router.refresh();
    });
  };

  const onTest = async () => {
    setTesting(true);
    setTestResult(null);
    const r = await testCloverConnection(input());
    setTesting(false);
    setTestResult({ ok: r.ok, message: r.merchantName ? `${r.message} (${r.merchantName})` : r.message });
  };

  return (
    <div className={styles.wrap}>
      {/* Status banner */}
      {!status.tableReady ? (
        <div className={`${styles.banner} ${styles.warn}`}>
          Settings table not found — the phantom (mock) Clover is active. Run
          migration <code>0004_integration_settings.sql</code> to enable saving
          and the live toggle.
        </div>
      ) : (
        <div className={`${styles.banner} ${status.effectiveMode === 'live' ? styles.live : styles.mock}`}>
          Currently running: <strong>{status.effectiveMode === 'live' ? 'LIVE Clover' : 'Phantom Clover (mock)'}</strong>
          {status.mode === 'live' && status.effectiveMode === 'mock' && (
            <> — set to Live but missing merchant ID / API token, so it falls back to mock.</>
          )}
        </div>
      )}

      <section className={styles.card}>
        <h3>Clover</h3>
        <p className={styles.hint}>
          The store talks to Clover through one switch. Leave it on{' '}
          <strong>Mock</strong> to simulate everything (no account needed). Flip
          to <strong>Live</strong> once you&apos;ve entered real credentials.
        </p>

        {/* Mode toggle */}
        <div className={styles.toggle}>
          <button
            type="button"
            className={`${styles.toggleBtn} ${mode === 'mock' ? styles.toggleActive : ''}`}
            onClick={() => setMode('mock')}
          >
            <FlaskConical size={16} /> Mock (phantom)
          </button>
          <button
            type="button"
            className={`${styles.toggleBtn} ${mode === 'live' ? styles.toggleActive : ''}`}
            onClick={() => setMode('live')}
          >
            <Radio size={16} /> Live
          </button>
        </div>

        {/* Credentials */}
        <div className={styles.grid}>
          <label className={styles.field}>
            <span>Environment</span>
            <select value={environment} onChange={(e) => setEnvironment(e.target.value as 'sandbox' | 'production')}>
              <option value="sandbox">Sandbox (testing)</option>
              <option value="production">Production (real money)</option>
            </select>
          </label>
          <label className={styles.field}>
            <span>Merchant ID (mId)</span>
            <input value={merchantId} onChange={(e) => setMerchantId(e.target.value)} placeholder="e.g. ABCDE1234FGHI" />
          </label>
          <label className={styles.field}>
            <span>Platform API Token {status.hasApiToken && <em className={styles.set}>· set {status.apiTokenMasked}</em>}</span>
            <input type="password" value={apiToken} onChange={(e) => setApiToken(e.target.value)} placeholder={status.hasApiToken ? 'leave blank to keep current' : 'paste token'} autoComplete="off" />
          </label>
          <label className={styles.field}>
            <span>Ecommerce Public Key (PAKMS)</span>
            <input value={ecommPublicKey} onChange={(e) => setEcommPublicKey(e.target.value)} placeholder="browser tokenization key" autoComplete="off" />
          </label>
          <label className={styles.field}>
            <span>Ecommerce Private Key {status.hasEcommPrivateKey && <em className={styles.set}>· set {status.ecommPrivateKeyMasked}</em>}</span>
            <input type="password" value={ecommPrivateKey} onChange={(e) => setEcommPrivateKey(e.target.value)} placeholder={status.hasEcommPrivateKey ? 'leave blank to keep current' : 'server charge key'} autoComplete="off" />
          </label>
        </div>

        <p className={styles.where}>
          Where to find these: Clover Dashboard → <strong>Setup → API Tokens</strong> (Merchant ID + Platform token),
          and <strong>Settings → Ecommerce → API Tokens</strong> (public + private ecommerce keys). Use Sandbox first.
        </p>

        <div className={styles.actions}>
          <button type="button" className="btn-secondary" onClick={onTest} disabled={testing}>
            {testing ? <><Loader2 size={16} className={styles.spin} /> Testing…</> : 'Test Connection'}
          </button>
          <button type="button" className="btn-primary" onClick={onSave} disabled={saving}>
            {saving ? 'Saving…' : 'Save Settings'}
          </button>
        </div>

        {testResult && (
          <div className={`${styles.result} ${testResult.ok ? styles.ok : styles.err}`}>
            {testResult.ok ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
            <span>{testResult.message}</span>
          </div>
        )}
        {saved && <div className={styles.saved}>{saved}</div>}
      </section>
    </div>
  );
}
