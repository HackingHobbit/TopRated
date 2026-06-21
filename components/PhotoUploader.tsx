'use client';

import { useCallback, useRef, useState } from 'react';
import Image from 'next/image';
import { Camera, ImagePlus, X, Star, Loader2 } from 'lucide-react';
import { getSupabaseBrowser } from '@/lib/supabase/browser';
import type { UploadedImage } from '@/lib/types';
import styles from './PhotoUploader.module.css';

interface Props {
  value: UploadedImage[];
  onChange: (images: UploadedImage[]) => void;
  /** Storage path prefix, e.g. 'singles'. Files land at `${prefix}/<rand>.jpg`. */
  pathPrefix?: string;
  disabled?: boolean;
}

const BUCKET = 'product-images';
const MAX_EDGE = 1600; // px — downscale longest side before upload
const JPEG_QUALITY = 0.85;

/**
 * Drag-drop + file-picker + camera-capture photo uploader. Uploads straight to
 * Supabase Storage (admin session + storage RLS), compresses client-side first,
 * and hands the resulting public URLs back via onChange. The first image is the
 * primary (used as the product thumbnail).
 *
 * Mobile: the "Take Photo" button uses capture="environment" so it opens the
 * rear camera directly — tap, shoot, upload. "Add Photos" opens the library /
 * file picker and supports multi-select.
 */
export default function PhotoUploader({
  value,
  onChange,
  pathPrefix = 'uploads',
  disabled = false,
}: Props) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const pickerRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);

  const uploadFiles = useCallback(
    async (files: FileList | File[]) => {
      const list = Array.from(files).filter((f) => f.type.startsWith('image/'));
      if (list.length === 0) return;

      const supabase = getSupabaseBrowser();
      if (!supabase) {
        setError('Image upload requires Supabase to be configured.');
        return;
      }

      setBusy(true);
      setError(null);
      const added: UploadedImage[] = [];
      try {
        for (const file of list) {
          const blob = await compressImage(file);
          // Random-ish unique path without Math.random()/Date.now (blocked in
          // some sandboxes): use crypto.randomUUID where available.
          const id =
            typeof crypto !== 'undefined' && crypto.randomUUID
              ? crypto.randomUUID()
              : `${file.name}-${file.size}-${added.length}`;
          const path = `${pathPrefix}/${id}.jpg`;
          const { error: upErr } = await supabase.storage
            .from(BUCKET)
            .upload(path, blob, { contentType: 'image/jpeg', upsert: false });
          if (upErr) throw new Error(upErr.message);
          const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
          added.push({ url: data.publicUrl, path });
        }
        onChange([...value, ...added]);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Upload failed.');
      } finally {
        setBusy(false);
      }
    },
    [onChange, pathPrefix, value]
  );

  const removeAt = async (idx: number) => {
    const img = value[idx];
    onChange(value.filter((_, i) => i !== idx));
    // Best-effort delete of the orphaned Storage object.
    const supabase = getSupabaseBrowser();
    if (supabase && img?.path) {
      supabase.storage.from(BUCKET).remove([img.path]).catch(() => {});
    }
  };

  const makePrimary = (idx: number) => {
    if (idx === 0) return;
    const next = [...value];
    const [chosen] = next.splice(idx, 1);
    onChange([chosen, ...next]);
  };

  return (
    <div className={styles.wrapper}>
      <div
        className={`${styles.dropzone} ${dragOver ? styles.dragOver : ''}`}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          if (!disabled) uploadFiles(e.dataTransfer.files);
        }}
      >
        <ImagePlus size={28} className={styles.dropIcon} />
        <p className={styles.dropText}>
          Drag photos here, or use the buttons below
        </p>
        <div className={styles.buttonRow}>
          <button
            type="button"
            className={styles.uploadBtn}
            onClick={() => pickerRef.current?.click()}
            disabled={disabled || busy}
          >
            <ImagePlus size={18} /> Add Photos
          </button>
          <button
            type="button"
            className={styles.cameraBtn}
            onClick={() => cameraRef.current?.click()}
            disabled={disabled || busy}
          >
            <Camera size={18} /> Take Photo
          </button>
        </div>
        {busy && (
          <p className={styles.status}>
            <Loader2 size={16} className={styles.spin} /> Uploading…
          </p>
        )}
        {error && <p className={styles.error}>{error}</p>}
      </div>

      {/* Library / file picker (multi-select) */}
      <input
        ref={pickerRef}
        type="file"
        accept="image/*"
        multiple
        hidden
        onChange={(e) => {
          if (e.target.files) uploadFiles(e.target.files);
          e.target.value = '';
        }}
      />
      {/* Rear-camera capture — opens the camera directly on mobile */}
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        hidden
        onChange={(e) => {
          if (e.target.files) uploadFiles(e.target.files);
          e.target.value = '';
        }}
      />

      {value.length > 0 && (
        <ul className={styles.thumbs}>
          {value.map((img, idx) => (
            <li key={img.path} className={styles.thumb}>
              <Image
                src={img.url}
                alt={`Photo ${idx + 1}`}
                width={120}
                height={120}
                className={styles.thumbImg}
                sizes="120px"
                unoptimized
              />
              {idx === 0 ? (
                <span className={`${styles.badge} ${styles.primaryBadge}`}>
                  <Star size={12} fill="currentColor" /> Primary
                </span>
              ) : (
                <button
                  type="button"
                  className={`${styles.badge} ${styles.makePrimaryBtn}`}
                  onClick={() => makePrimary(idx)}
                >
                  <Star size={12} /> Make primary
                </button>
              )}
              <button
                type="button"
                className={styles.removeBtn}
                onClick={() => removeAt(idx)}
                aria-label="Remove photo"
              >
                <X size={14} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/**
 * Downscale + re-encode an image client-side so we don't push multi-MB phone
 * photos straight to Storage. Falls back to the original file on any failure.
 * Dependency-free (canvas).
 */
async function compressImage(file: File): Promise<Blob> {
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
    const w = Math.round(bitmap.width * scale);
    const h = Math.round(bitmap.height * scale);
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, w, h);
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/jpeg', JPEG_QUALITY)
    );
    return blob ?? file;
  } catch {
    return file;
  }
}
