'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/contexts/ToastContext';
import PhotoUploader from '@/components/PhotoUploader';
import { createSingle, updateSingle, type SingleInput } from '@/lib/singleActions';
import type { CategoryOption } from '@/lib/db';
import type { UploadedImage } from '@/lib/types';
import styles from './singles.module.css';

export interface SingleFormInitial {
  name: string;
  description: string;
  price: string;
  categoryId: string;
  subject: string;
  cardSet: string;
  year: string;
  cardNumber: string;
  condition: string;
  isGraded: boolean;
  grader: string;
  grade: string;
  certNumber: string;
  images: UploadedImage[];
  isFeatured: boolean;
  isSale: boolean;
  isNewRelease: boolean;
  isLimited: boolean;
  isOutOfStock: boolean;
  imageRepresentative: boolean;
}

const EMPTY: SingleFormInitial = {
  name: '',
  description: '',
  price: '',
  categoryId: '',
  subject: '',
  cardSet: '',
  year: '',
  cardNumber: '',
  condition: '',
  isGraded: false,
  grader: '',
  grade: '',
  certNumber: '',
  images: [],
  isFeatured: false,
  isSale: false,
  isNewRelease: false,
  isLimited: false,
  isOutOfStock: false,
  imageRepresentative: false,
};

interface Props {
  mode: 'create' | 'edit';
  categories: CategoryOption[];
  productId?: string;
  initial?: SingleFormInitial;
}

export default function SingleForm({
  mode,
  categories,
  productId,
  initial,
}: Props) {
  const router = useRouter();
  const { addToast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [f, setF] = useState<SingleFormInitial>(initial ?? EMPTY);

  const set = <K extends keyof SingleFormInitial>(
    key: K,
    value: SingleFormInitial[K]
  ) => setF((prev) => ({ ...prev, [key]: value }));

  const valid =
    f.name.trim() !== '' && f.categoryId !== '' && Number(f.price) > 0;

  const submit = () => {
    if (!valid) return;
    const input: SingleInput = {
      name: f.name.trim(),
      description: f.description.trim(),
      price: Number(f.price),
      categoryId: f.categoryId,
      subject: f.subject.trim(),
      cardSet: f.cardSet.trim(),
      year: f.year ? Number(f.year) : null,
      cardNumber: f.cardNumber.trim(),
      condition: f.condition.trim(),
      isGraded: f.isGraded,
      grader: f.grader.trim(),
      grade: f.grade.trim(),
      certNumber: f.certNumber.trim(),
      images: f.images,
      isFeatured: f.isFeatured,
      isSale: f.isSale,
      isNewRelease: f.isNewRelease,
      isLimited: f.isLimited,
      isOutOfStock: f.isOutOfStock,
      imageRepresentative: f.imageRepresentative,
    };
    startTransition(async () => {
      const res =
        mode === 'create'
          ? await createSingle(input)
          : await updateSingle(productId!, input);
      if (res.ok) {
        addToast({
          title: mode === 'create' ? 'Single added' : 'Single updated',
          message: `${input.name} saved.`,
          type: 'success',
        });
        router.push('/admin/singles');
        router.refresh();
      } else {
        addToast({
          title: 'Save failed',
          message: res.error ?? 'Something went wrong.',
          type: 'error',
        });
      }
    });
  };

  return (
    <div className={styles.formWrap}>
      {/* Photos first — this is the part that should feel effortless on a phone */}
      <section className={styles.formSection}>
        <h3>Photos</h3>
        <p className={styles.hint}>
          On a phone, tap <strong>Take Photo</strong> to shoot the card with your
          camera — it uploads instantly. The first photo is the primary thumbnail.
        </p>
        <PhotoUploader
          value={f.images}
          onChange={(images) => set('images', images)}
          pathPrefix="singles"
          searchQuery={f.name}
          disabled={isPending}
        />
        <label className={styles.checkRow}>
          <input
            type="checkbox"
            checked={f.imageRepresentative}
            onChange={(e) => set('imageRepresentative', e.target.checked)}
          />
          Representative photo — a close stand-in, not the exact item (shows a
          &ldquo;Representative image&rdquo; note to shoppers)
        </label>
      </section>

      <section className={styles.formSection}>
        <h3>Card details</h3>
        <div className={styles.grid}>
          <Field label="Title *">
            <input
              value={f.name}
              onChange={(e) => set('name', e.target.value)}
              placeholder="2003 LeBron James Topps Chrome RC #111"
            />
          </Field>
          <Field label="Category *">
            <select
              value={f.categoryId}
              onChange={(e) => set('categoryId', e.target.value)}
            >
              <option value="">Select a category…</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.topLevel} › {c.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Price ($) *">
            <input
              type="number"
              step="0.01"
              value={f.price}
              onChange={(e) => set('price', e.target.value)}
            />
          </Field>
          <Field label="Subject / Player">
            <input
              value={f.subject}
              onChange={(e) => set('subject', e.target.value)}
            />
          </Field>
          <Field label="Set">
            <input
              value={f.cardSet}
              onChange={(e) => set('cardSet', e.target.value)}
            />
          </Field>
          <Field label="Year">
            <input
              type="number"
              value={f.year}
              onChange={(e) => set('year', e.target.value)}
            />
          </Field>
          <Field label="Card #">
            <input
              value={f.cardNumber}
              onChange={(e) => set('cardNumber', e.target.value)}
            />
          </Field>
        </div>
        <Field label="Description">
          <textarea
            rows={3}
            value={f.description}
            onChange={(e) => set('description', e.target.value)}
          />
        </Field>
      </section>

      <section className={styles.formSection}>
        <h3>Condition &amp; grading</h3>
        <label className={styles.checkRow}>
          <input
            type="checkbox"
            checked={f.isGraded}
            onChange={(e) => set('isGraded', e.target.checked)}
          />
          This card is professionally graded
        </label>
        {f.isGraded ? (
          <div className={styles.grid}>
            <Field label="Grader">
              <select
                value={f.grader}
                onChange={(e) => set('grader', e.target.value)}
              >
                <option value="">Select…</option>
                <option>PSA</option>
                <option>BGS</option>
                <option>SGC</option>
                <option>CGC</option>
              </select>
            </Field>
            <Field label="Grade">
              <input
                value={f.grade}
                onChange={(e) => set('grade', e.target.value)}
                placeholder="10, 9.5…"
              />
            </Field>
            <Field label="Cert #">
              <input
                value={f.certNumber}
                onChange={(e) => set('certNumber', e.target.value)}
              />
            </Field>
          </div>
        ) : (
          <Field label="Condition">
            <input
              value={f.condition}
              onChange={(e) => set('condition', e.target.value)}
              placeholder="Near Mint, Lightly Played…"
            />
          </Field>
        )}
      </section>

      <section className={styles.formSection}>
        <h3>Storefront flags</h3>
        <div className={styles.flagRow}>
          {([
            ['isFeatured', 'Featured'],
            ['isNewRelease', 'New'],
            ['isSale', 'On Sale'],
            ['isLimited', 'Limited'],
            ['isOutOfStock', 'Out of Stock'],
          ] as const).map(([key, label]) => (
            <label key={key} className={styles.flagChip}>
              <input
                type="checkbox"
                checked={f[key]}
                onChange={(e) => set(key, e.target.checked)}
              />
              {label}
            </label>
          ))}
        </div>
      </section>

      <div className={styles.formActions}>
        <button
          className="btn-secondary"
          onClick={() => router.push('/admin/singles')}
          disabled={isPending}
        >
          Cancel
        </button>
        <button className="btn-primary" onClick={submit} disabled={!valid || isPending}>
          {isPending
            ? 'Saving…'
            : mode === 'create'
              ? 'Add Single'
              : 'Save Changes'}
        </button>
      </div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className={styles.field}>
      <span>{label}</span>
      {children}
    </label>
  );
}
