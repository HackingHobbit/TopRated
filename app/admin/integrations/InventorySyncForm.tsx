'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import {
  saveInventorySyncSettings,
  syncInventoryFromClover,
  type InventorySyncStatus,
} from '@/lib/cloverActions';
import type { InventorySyncReport, SyncChange } from '@/lib/clover/inventorySync';
import styles from './integrations.module.css';

function ChangeList({ title, items }: { title: string; items: SyncChange[] }) {
  if (items.length === 0) return null;
  return (
    <details className={styles.syncGroup}>
      <summary>
        {title} <strong>({items.length})</strong>
      </summary>
      <ul>
        {items.map((c) => (
          <li key={c.id}>
            {c.name} <span className={styles.syncDetail}>— {c.detail}</span>
          </li>
        ))}
      </ul>
    </details>
  );
}

export default function InventorySyncForm({ status }: { status: InventorySyncStatus }) {
  const router = useRouter();
  const [merchantId, setMerchantId] = useState(status.merchantId);
  const [apiToken, setApiToken] = useState('');
  const [busy, setBusy] = useState<null | 'save' | 'preview' | 'apply'>(null);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [report, setReport] = useState<InventorySyncReport | null>(null);

  const onSave = async () => {
    setBusy('save');
    setMessage(null);
    const res = await saveInventorySyncSettings({ merchantId, apiToken: apiToken || undefined });
    setBusy(null);
    setMessage(res.ok ? { ok: true, text: 'Saved.' } : { ok: false, text: `Save failed: ${res.error}` });
    if (res.ok) {
      setApiToken('');
      router.refresh();
    }
  };

  const run = async (apply: boolean) => {
    setBusy(apply ? 'apply' : 'preview');
    setMessage(null);
    const res = await syncInventoryFromClover(apply);
    setBusy(null);
    if (!res.ok || !res.report) {
      setMessage({ ok: false, text: res.error ?? 'Sync failed.' });
      return;
    }
    setReport(res.report);
    if (apply) {
      setMessage({ ok: true, text: 'Website updated from Clover.' });
      router.refresh();
    }
  };

  const nothingToDo =
    report &&
    report.priceChanges.length +
      report.nowOutOfStock.length +
      report.backInStock.length +
      report.added.length +
      report.quantityUpdates ===
      0;

  return (
    <section className={styles.card}>
      <h3>Inventory sync (real Clover account)</h3>
      <p className={styles.hint}>
        Copies products, prices and stock from the store&apos;s real Clover account. Items at 0 stock
        are marked out of stock; items back above 0 are marked in stock (pre-orders are left alone).
        New Clover items are added with a placeholder photo. Names, photos and descriptions you&apos;ve
        edited on the website are never overwritten. This is separate from payments above.
      </p>

      {!status.tableReady ? (
        <div className={`${styles.banner} ${styles.warn}`}>
          Run migration <code>0009_clover_inventory_sync.sql</code> in Supabase to enable this.
        </div>
      ) : (
        <>
          <div className={styles.grid}>
            <label className={styles.field}>
              <span>Merchant ID</span>
              <input value={merchantId} onChange={(e) => setMerchantId(e.target.value)} placeholder="e.g. ABCDE1234FGHI" />
            </label>
            <label className={styles.field}>
              <span>
                Clover API Token {status.hasToken && <em className={styles.set}>· set {status.tokenMasked}</em>}
              </span>
              <input
                type="password"
                value={apiToken}
                onChange={(e) => setApiToken(e.target.value)}
                placeholder={status.hasToken ? 'leave blank to keep current' : 'paste token'}
                autoComplete="off"
              />
            </label>
          </div>

          <p className={styles.where}>
            Last synced:{' '}
            <strong>{status.syncedAt ? new Date(status.syncedAt).toLocaleString() : 'never'}</strong>
          </p>

          <div className={styles.actions}>
            <button type="button" className="btn-secondary" onClick={onSave} disabled={busy !== null}>
              {busy === 'save' ? 'Saving…' : 'Save'}
            </button>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => run(false)}
              disabled={busy !== null || !status.hasToken}
            >
              {busy === 'preview' ? <><Loader2 size={16} className={styles.spin} /> Checking Clover…</> : 'Preview changes'}
            </button>
            <button
              type="button"
              className="btn-primary"
              onClick={() => run(true)}
              disabled={busy !== null || !report || report.applied || Boolean(nothingToDo)}
              title={!report ? 'Preview first' : undefined}
            >
              {busy === 'apply' ? <><Loader2 size={16} className={styles.spin} /> Updating…</> : 'Apply to website'}
            </button>
          </div>

          {message && (
            <div className={`${styles.result} ${message.ok ? styles.ok : styles.err}`}>
              {message.ok ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
              <span>{message.text}</span>
            </div>
          )}

          {report && (
            <div className={styles.syncReport}>
              <p>
                {report.applied ? 'Applied' : 'Preview'}: {report.cloverItems} items in Clover, {report.matched} already on
                the website{report.websiteOnly > 0 && `, ${report.websiteOnly} website-only products left alone`}.
                {nothingToDo && ' Everything is already up to date.'}
              </p>
              {report.quantityUpdates > 0 && <p>Stock counts updated: {report.quantityUpdates}</p>}
              <ChangeList title="Price changes" items={report.priceChanges} />
              <ChangeList title="Now out of stock" items={report.nowOutOfStock} />
              <ChangeList title="Back in stock" items={report.backInStock} />
              <ChangeList title="New products added (placeholder photo)" items={report.added} />
              <ChangeList title="Skipped — fix in Clover, then sync again" items={report.skipped} />
            </div>
          )}
        </>
      )}
    </section>
  );
}
