import { notFound } from 'next/navigation';
import { getSingleWithDetails, getCategories } from '@/lib/db';
import SingleForm, { type SingleFormInitial } from '../../SingleForm';
import adminStyles from '../../../page.module.css';

export default async function EditSinglePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [single, categories] = await Promise.all([
    getSingleWithDetails(id),
    getCategories(),
  ]);
  if (!single) notFound();

  const { product, detail, images } = single;
  const initial: SingleFormInitial = {
    name: product.name,
    description: product.description,
    price: String(product.price),
    categoryId: product.subCategory,
    subject: detail?.subject ?? '',
    cardSet: detail?.cardSet ?? '',
    year: detail?.year != null ? String(detail.year) : '',
    cardNumber: detail?.cardNumber ?? '',
    condition: detail?.condition ?? '',
    isGraded: detail?.isGraded ?? false,
    grader: detail?.grader ?? '',
    grade: detail?.grade ?? '',
    certNumber: detail?.certNumber ?? '',
    images: images.map((im) => ({
      url: im.url,
      path: im.url.split('/product-images/')[1] ?? '',
    })),
    isFeatured: product.isFeatured,
    isSale: product.isSale,
    isNewRelease: product.isNewRelease,
    isLimited: product.isLimited,
    isOutOfStock: product.isOutOfStock,
    imageRepresentative: product.imageRepresentative,
  };

  return (
    <>
      <div className={adminStyles.header}>
        <h1>Edit Single</h1>
      </div>
      <SingleForm
        mode="edit"
        productId={id}
        categories={categories}
        initial={initial}
      />
    </>
  );
}
