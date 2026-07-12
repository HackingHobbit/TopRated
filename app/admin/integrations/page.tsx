import { getCloverStatus } from '@/lib/cloverActions';
import CloverSettingsForm from './CloverSettingsForm';
import adminStyles from '../page.module.css';

export default async function IntegrationsPage() {
  const status = await getCloverStatus();
  return (
    <>
      <div className={adminStyles.header}>
        <h1>Integrations</h1>
      </div>
      <CloverSettingsForm status={status} />
    </>
  );
}
