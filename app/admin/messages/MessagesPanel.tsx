'use client';

import { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { useToast } from '@/contexts/ToastContext';
import { replyAsAdmin, setThreadStatus } from '@/lib/supportActions';
import type { SupportThread } from '@/lib/types';
import styles from '../page.module.css';

const STATUSES: Array<'open' | 'closed'> = ['open', 'closed'];

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function statusLabel(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export default function MessagesPanel({ initialThreads }: { initialThreads: SupportThread[] }) {
  const [threads, setThreads] = useState(initialThreads);
  const [visibleStatuses, setVisibleStatuses] = useState<Set<'open' | 'closed'>>(
    () => new Set(['open'])
  );
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(initialThreads[0]?.id ?? null);
  const [reply, setReply] = useState('');
  const [sending, setSending] = useState(false);
  const [statusUpdating, setStatusUpdating] = useState(false);
  const { addToast } = useToast();

  const toggleStatus = (s: 'open' | 'closed') => {
    setVisibleStatuses((prev) => {
      const next = new Set(prev);
      if (next.has(s)) next.delete(s);
      else next.add(s);
      return next;
    });
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return threads.filter((t) => {
      if (!visibleStatuses.has(t.status)) return false;
      if (
        q &&
        !(
          t.subject.toLowerCase().includes(q) ||
          t.customerName.toLowerCase().includes(q) ||
          t.customerEmail.toLowerCase().includes(q)
        )
      )
        return false;
      return true;
    });
  }, [threads, visibleStatuses, query]);

  const hasFilters = query || visibleStatuses.size !== 1 || !visibleStatuses.has('open');
  const clearFilters = () => {
    setQuery('');
    setVisibleStatuses(new Set(['open']));
  };

  const selected = threads.find((t) => t.id === selectedId) ?? null;

  const handleSelect = (id: string) => {
    setSelectedId(id);
    setReply('');
  };

  const handleReply = async () => {
    if (!selected || !reply.trim()) return;
    setSending(true);
    const res = await replyAsAdmin(selected.id, reply.trim());
    setSending(false);
    if (!res.ok) {
      addToast({ title: 'Failed', message: res.error || 'Could not send reply.', type: 'error' });
      return;
    }
    setThreads((prev) =>
      prev.map((t) =>
        t.id === selected.id
          ? {
              ...t,
              status: 'open',
              messages: [
                ...t.messages,
                { id: `local-${Date.now()}`, sender: 'admin', body: reply.trim(), createdAt: new Date().toISOString() },
              ],
            }
          : t
      )
    );
    setReply('');
    addToast({ title: 'Reply Sent', message: `Reply posted to ${selected.customerName || selected.customerEmail}.`, type: 'success' });
  };

  const handleToggleStatus = async () => {
    if (!selected) return;
    const next = selected.status === 'open' ? 'closed' : 'open';
    setStatusUpdating(true);
    const res = await setThreadStatus(selected.id, next);
    setStatusUpdating(false);
    if (!res.ok) {
      addToast({ title: 'Failed', message: res.error || 'Could not update thread.', type: 'error' });
      return;
    }
    setThreads((prev) => prev.map((t) => (t.id === selected.id ? { ...t, status: next } : t)));
    addToast({ title: 'Thread Updated', message: `Marked ${next}.`, type: 'success' });
  };

  return (
    <div className={`glass-panel ${styles.tableContainer}`}>
      <div className={styles.filterBar}>
        <div className={styles.searchWrapper}>
          <Search size={16} className={styles.searchIcon} />
          <input
            className={styles.searchInput}
            placeholder="Search name or subject…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        {hasFilters && (
          <button type="button" className={styles.clear} onClick={clearFilters}>
            Reset filters
          </button>
        )}
        <span className={styles.count}>
          {filtered.length} of {threads.length}
        </span>
      </div>

      <div className={styles.statusChipBar}>
        {STATUSES.map((s) => {
          const active = visibleStatuses.has(s);
          return (
            <button
              key={s}
              type="button"
              onClick={() => toggleStatus(s)}
              className={
                active
                  ? `${styles.statusBadge} ${styles.statusChip} ${s === 'open' ? styles.pending : styles.refunded}`
                  : `${styles.statusBadge} ${styles.statusChip} ${styles.statusChipInactive}`
              }
            >
              {statusLabel(s)}
            </button>
          );
        })}
      </div>

      <div className={styles.messagesLayout}>
        <div className={styles.threadList}>
          {filtered.length === 0 && (
            <p className={styles.emptyRow}>No messages match these filters.</p>
          )}
          {filtered.map((t) => (
            <button
              key={t.id}
              type="button"
              className={`${styles.threadListItem} ${t.id === selectedId ? styles.threadListItemActive : ''}`}
              onClick={() => handleSelect(t.id)}
            >
              <div className={styles.threadListItemTop}>
                <span className={styles.customerName}>{t.customerName || t.customerEmail}</span>
                <span
                  className={`${styles.statusBadge} ${t.status === 'open' ? styles.pending : styles.refunded}`}
                >
                  {statusLabel(t.status)}
                </span>
              </div>
              <div className={styles.threadListSubject}>{t.subject}</div>
              <div className={styles.threadListMeta}>
                {t.isGuest ? 'Guest' : 'Account'} &middot; {formatDateTime(t.updatedAt)}
              </div>
            </button>
          ))}
        </div>

        <div className={styles.threadDetail}>
          {!selected ? (
            <p className={styles.emptyRow}>Select a message to view the conversation.</p>
          ) : (
            <>
              <div className={styles.threadDetailHeader}>
                <div>
                  <h3>{selected.subject}</h3>
                  <p className={styles.customerEmail}>
                    {selected.customerName} &middot; {selected.customerEmail}
                  </p>
                </div>
                <button
                  type="button"
                  className={styles.demoDeleteBtn}
                  onClick={handleToggleStatus}
                  disabled={statusUpdating}
                >
                  {selected.status === 'open' ? 'Mark Closed' : 'Reopen'}
                </button>
              </div>

              {selected.isGuest && (
                <p className={styles.guestNotice}>
                  This person submitted as a guest — there&apos;s no account to
                  show them a reply in. Your reply below is saved for the
                  record; to actually reach them, follow up directly at{' '}
                  <a href={`mailto:${selected.customerEmail}`}>{selected.customerEmail}</a>.
                </p>
              )}

              <div className={styles.messageThread}>
                {selected.messages.map((m) => (
                  <div
                    key={m.id}
                    className={`${styles.messageBubble} ${m.sender === 'admin' ? styles.messageBubbleAdmin : styles.messageBubbleCustomer}`}
                  >
                    <div className={styles.messageBubbleMeta}>
                      {m.sender === 'admin' ? 'You' : selected.customerName || 'Customer'} &middot;{' '}
                      {formatDateTime(m.createdAt)}
                    </div>
                    <p>{m.body}</p>
                  </div>
                ))}
              </div>

              <div className={styles.replyBox}>
                <textarea
                  placeholder="Type a reply…"
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                />
                <button
                  type="button"
                  className="btn-primary"
                  onClick={handleReply}
                  disabled={sending || !reply.trim()}
                >
                  {sending ? 'Sending…' : 'Send Reply'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
