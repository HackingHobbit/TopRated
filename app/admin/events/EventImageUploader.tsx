'use client';

import { useRef, useState } from 'react';
import { ImagePlus, Loader2, X } from 'lucide-react';
import { getSupabaseBrowser } from '@/lib/supabase/browser';
import styles from './page.module.css';

const BUCKET = 'product-images';

export default function EventImageUploader({
  value,
  onChange,
}: {
  value: string;
  onChange: (url: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const upload = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setError('Please choose an image file.');
      return;
    }

    const supabase = getSupabaseBrowser();
    if (!supabase) {
      setError('Image upload requires Supabase to be configured.');
      return;
    }

    setIsUploading(true);
    setError(null);
    try {
      const id = crypto.randomUUID();
      const storagePath = `events/${id}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '-')}`;
      const { error: uploadError } = await supabase.storage
        .from(BUCKET)
        .upload(storagePath, file, { contentType: file.type, upsert: false });

      if (uploadError) throw new Error(uploadError.message);
      const { data } = supabase.storage.from(BUCKET).getPublicUrl(storagePath);
      onChange(data.publicUrl);
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : 'Upload failed.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className={styles.imageUploader}>
      {value ? (
        <div className={styles.imagePreviewWrap}>
          <img src={value} alt="Event preview" className={styles.imagePreview} />
          <button
            type="button"
            className={styles.replaceImage}
            onClick={() => inputRef.current?.click()}
            disabled={isUploading}
          >
            Replace
          </button>
          <button
            type="button"
            className={styles.removeImage}
            onClick={() => onChange('')}
            aria-label="Remove event image"
          >
            <X size={16} />
          </button>
        </div>
      ) : (
        <button
          type="button"
          className={styles.uploadImageButton}
          onClick={() => inputRef.current?.click()}
          disabled={isUploading}
        >
          {isUploading ? <Loader2 size={18} className={styles.spin} /> : <ImagePlus size={18} />}
          {isUploading ? 'Uploading…' : 'Upload Event Image'}
        </button>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        hidden
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void upload(file);
          event.target.value = '';
        }}
      />
      {error && <p className={styles.uploadError}>{error}</p>}
    </div>
  );
}
