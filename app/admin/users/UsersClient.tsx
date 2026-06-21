'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { UserPlus, Trash2, KeyRound, Pencil, X } from 'lucide-react';
import { useToast } from '@/contexts/ToastContext';
import type { AdminUser } from '@/lib/types';
import {
  setUserRole,
  updateUserProfile,
  createUser,
  deleteUser,
  sendPasswordReset,
} from '@/lib/userActions';
import styles from './users.module.css';

interface Props {
  initialUsers: AdminUser[];
  currentUserId: string | null;
  canCreateDelete: boolean;
}

export default function UsersClient({
  initialUsers,
  currentUserId,
  canCreateDelete,
}: Props) {
  const router = useRouter();
  const { addToast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [query, setQuery] = useState('');
  const [editing, setEditing] = useState<AdminUser | null>(null);
  const [creating, setCreating] = useState(false);

  const filtered = initialUsers.filter((u) => {
    const q = query.toLowerCase();
    return (
      u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)
    );
  });

  const run = (fn: () => Promise<{ ok: boolean; error?: string }>, ok: string) =>
    startTransition(async () => {
      const res = await fn();
      if (res.ok) {
        addToast({ title: 'Done', message: ok, type: 'success' });
        router.refresh();
      } else {
        addToast({
          title: 'Action failed',
          message: res.error ?? 'Something went wrong.',
          type: 'error',
        });
      }
    });

  return (
    <div>
      <div className={styles.toolbar}>
        <input
          className={styles.search}
          placeholder="Search by name or email…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <button
          className="btn-primary"
          onClick={() => setCreating(true)}
          disabled={!canCreateDelete}
          title={
            canCreateDelete
              ? 'Add a staff or customer account'
              : 'Set SUPABASE_SERVICE_ROLE_KEY on the server to enable account creation'
          }
        >
          <UserPlus size={16} /> Add User
        </button>
      </div>

      {!canCreateDelete && (
        <p className={styles.notice}>
          Create &amp; delete are disabled until the server has
          <code> SUPABASE_SERVICE_ROLE_KEY</code> configured. Role changes and
          profile edits work without it.
        </p>
      )}

      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Name / Email</th>
              <th>Role</th>
              <th>Loyalty</th>
              <th>Joined</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((u) => {
              const isSelf = u.id === currentUserId;
              return (
                <tr key={u.id} className={isPending ? styles.pending : ''}>
                  <td>
                    <div className={styles.name}>
                      {u.name || '—'} {isSelf && <span className={styles.you}>you</span>}
                    </div>
                    <div className={styles.email}>{u.email}</div>
                  </td>
                  <td>
                    <select
                      className={`${styles.roleSelect} ${u.role === 'admin' ? styles.roleAdmin : ''}`}
                      value={u.role}
                      disabled={isPending}
                      onChange={(e) =>
                        run(
                          () => setUserRole(u.id, e.target.value as 'admin' | 'customer'),
                          `${u.email} is now ${e.target.value}.`
                        )
                      }
                    >
                      <option value="customer">customer</option>
                      <option value="admin">admin</option>
                    </select>
                  </td>
                  <td>{u.loyaltyPoints}</td>
                  <td className={styles.joined}>
                    {u.createdAt ? u.createdAt.slice(0, 10) : '—'}
                  </td>
                  <td>
                    <div className={styles.actions}>
                      <button
                        className={styles.iconAction}
                        onClick={() => setEditing(u)}
                        title="Edit profile"
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        className={styles.iconAction}
                        onClick={() =>
                          run(
                            () => sendPasswordReset(u.email),
                            `Password reset sent to ${u.email}.`
                          )
                        }
                        title="Send password reset"
                      >
                        <KeyRound size={16} />
                      </button>
                      <button
                        className={`${styles.iconAction} ${styles.danger}`}
                        disabled={!canCreateDelete || isSelf}
                        onClick={() => {
                          if (
                            confirm(`Permanently delete ${u.email}? This cannot be undone.`)
                          ) {
                            run(() => deleteUser(u.id), `${u.email} deleted.`);
                          }
                        }}
                        title={isSelf ? "You can't delete yourself" : 'Delete user'}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={5} className={styles.empty}>
                  No users match “{query}”.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {editing && (
        <EditProfileModal
          user={editing}
          onClose={() => setEditing(null)}
          onSave={(name, loyaltyPoints) => {
            run(
              () => updateUserProfile(editing.id, { name, loyaltyPoints }),
              'Profile updated.'
            );
            setEditing(null);
          }}
        />
      )}

      {creating && (
        <CreateUserModal
          onClose={() => setCreating(false)}
          onCreate={(input) => {
            run(() => createUser(input), `Account created for ${input.email}.`);
            setCreating(false);
          }}
        />
      )}
    </div>
  );
}

function EditProfileModal({
  user,
  onClose,
  onSave,
}: {
  user: AdminUser;
  onClose: () => void;
  onSave: (name: string, loyaltyPoints: number) => void;
}) {
  const [name, setName] = useState(user.name);
  const [points, setPoints] = useState(String(user.loyaltyPoints));
  return (
    <Modal title={`Edit ${user.email}`} onClose={onClose}>
      <label className={styles.field}>
        <span>Name</span>
        <input value={name} onChange={(e) => setName(e.target.value)} />
      </label>
      <label className={styles.field}>
        <span>Loyalty points</span>
        <input
          type="number"
          value={points}
          onChange={(e) => setPoints(e.target.value)}
        />
      </label>
      <div className={styles.modalActions}>
        <button className="btn-secondary" onClick={onClose}>
          Cancel
        </button>
        <button
          className="btn-primary"
          onClick={() => onSave(name, Number(points) || 0)}
        >
          Save
        </button>
      </div>
    </Modal>
  );
}

function CreateUserModal({
  onClose,
  onCreate,
}: {
  onClose: () => void;
  onCreate: (input: {
    email: string;
    password: string;
    name: string;
    role: 'admin' | 'customer';
  }) => void;
}) {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'admin' | 'customer'>('customer');
  const valid = email.includes('@') && password.length >= 6;
  return (
    <Modal title="Add User" onClose={onClose}>
      <label className={styles.field}>
        <span>Email</span>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </label>
      <label className={styles.field}>
        <span>Name</span>
        <input value={name} onChange={(e) => setName(e.target.value)} />
      </label>
      <label className={styles.field}>
        <span>Temporary password (min 6 chars)</span>
        <input
          type="text"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </label>
      <label className={styles.field}>
        <span>Role</span>
        <select
          value={role}
          onChange={(e) => setRole(e.target.value as 'admin' | 'customer')}
        >
          <option value="customer">customer</option>
          <option value="admin">admin (staff)</option>
        </select>
      </label>
      <div className={styles.modalActions}>
        <button className="btn-secondary" onClick={onClose}>
          Cancel
        </button>
        <button
          className="btn-primary"
          disabled={!valid}
          onClick={() => onCreate({ email, password, name, role })}
        >
          Create account
        </button>
      </div>
    </Modal>
  );
}

function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className={styles.overlay} onClick={onClose}>
      <div
        className={`glass-panel ${styles.modal}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={styles.modalHeader}>
          <h2>{title}</h2>
          <button className={styles.closeBtn} onClick={onClose} aria-label="Close">
            <X size={20} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
