import { getCategories } from '@/lib/db';
import SingleForm from '../SingleForm';
import adminStyles from '../../page.module.css';

export default async function NewSinglePage() {
  const categories = await getCategories();
  return (
    <>
      <div className={adminStyles.header}>
        <h1>Add a Single</h1>
      </div>
      <SingleForm mode="create" categories={categories} />
    </>
  );
}
