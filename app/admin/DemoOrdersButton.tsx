'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Trash2, FlaskConical } from 'lucide-react';
import { deleteDemoOrders } from '@/lib/orderActions';
import styles from './page.module.css';

// Shown only in mock (demo) Clover mode. Bulk-deletes DEMO- orders (mock
// checkouts) so test data doesn't pile up in the real dashboard/orders.
export default function DemoOrdersButton({ count }: { count: number }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  const onClick = () => {
    if (count === 0) {
      setMsg('No demo orders to delete.');
      return;
    }
    const ok = window.confirm(
      `Delete ${count} demo order${count === 1 ? '' : 's'}?\n\n` +
        'This removes only DEMO- orders (mock checkouts) — never real orders. ' +
        'It cannot be undone.'
    );
    if (!ok) return;
    start(async () => {
      const res = await deleteDemoOrders();
      setMsg(
        res.ok
          ? `Deleted ${res.deleted} demo order${res.deleted === 1 ? '' : 's'}.`
          : `Failed: ${res.error}`
      );
      if (res.ok) router.refresh();
    });
  };

  return (
    <div className={styles.demoTools}>
      <span className={styles.demoBadge}>
        <FlaskConical size={13} /> Demo mode
      </span>
      <button
        type="button"
        className={styles.demoDeleteBtn}
        onClick={onClick}
        disabled={pending}
        title="Delete all mock-checkout (DEMO-) orders"
      >
        <Trash2 size={14} />
        {pending ? 'Deleting…' : `Delete demo orders${count ? ` (${count})` : ''}`}
      </button>
      {msg && <span className={styles.demoMsg}>{msg}</span>}
    </div>
  );
}
