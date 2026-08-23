import { getAdminThreads } from '@/lib/supportActions';
import MessagesPanel from './MessagesPanel';
import styles from '../page.module.css';

export default async function AdminMessages() {
  const threads = await getAdminThreads();

  return (
    <>
      <div className={styles.header}>
        <h1>Customer Messages</h1>
      </div>

      <MessagesPanel initialThreads={threads} />
    </>
  );
}
