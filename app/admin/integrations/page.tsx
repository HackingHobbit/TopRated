import { getCloverStatus, getInventorySyncStatus } from '@/lib/cloverActions';
import CloverSettingsForm from './CloverSettingsForm';
import InventorySyncForm from './InventorySyncForm';
import adminStyles from '../page.module.css';
import styles from './integrations.module.css';

export default async function IntegrationsPage() {
  const [status, inventoryStatus] = await Promise.all([getCloverStatus(), getInventorySyncStatus()]);
  return (
    <>
      <div className={adminStyles.header}>
        <h1>Integrations</h1>
      </div>
      <div className={styles.wrap}>
        <InventorySyncForm status={inventoryStatus} />
        <CloverSettingsForm status={status} />
      </div>
    </>
  );
}
