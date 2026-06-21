import Link from 'next/link';
import { Plus } from 'lucide-react';
import { getSingles } from '@/lib/db';
import SinglesClient from './SinglesClient';
import adminStyles from '../page.module.css';
import styles from './singles.module.css';

export default async function AdminSinglesPage() {
  const singles = await getSingles();

  return (
    <>
      <div className={adminStyles.header}>
        <div>
          <h1>Custom Inventory</h1>
          <p className={styles.subtitle}>
            Individual cards — {singles.length} listed, sorted by category
          </p>
        </div>
        <Link href="/admin/singles/new" className="btn-primary">
          <Plus size={16} /> Add Single
        </Link>
      </div>
      <SinglesClient singles={singles} />
    </>
  );
}
