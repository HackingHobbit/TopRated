"use client";

import { useToast } from '@/contexts/ToastContext';
import styles from './Toast.module.css';
import { CheckCircle, XCircle, Info, X } from 'lucide-react';

export default function ToastContainer() {
  const { toasts, removeToast } = useToast();

  if (toasts.length === 0) return null;

  return (
    <div className={styles.toastContainer}>
      {toasts.map((toast) => (
        <div 
          key={toast.id} 
          className={`${styles.toast} ${styles[toast.type || 'info']}`}
        >
          <div className={styles.icon}>
            {toast.type === 'success' && <CheckCircle size={20} />}
            {toast.type === 'error' && <XCircle size={20} />}
            {(toast.type === 'info' || !toast.type) && <Info size={20} />}
          </div>
          
          <div className={styles.content}>
            <h4>{toast.title}</h4>
            <p>{toast.message}</p>
          </div>
          
          <button 
            onClick={() => removeToast(toast.id)} 
            className={styles.closeBtn}
          >
            <X size={16} />
          </button>
        </div>
      ))}
    </div>
  );
}
