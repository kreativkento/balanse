import { useEffect, useRef, useState } from 'react';
import { Check, ImagePlus, Loader2 } from 'lucide-react';
import {
  isDisciplineBucketImageUrl,
  listDisciplineCoverImages,
  listDisciplineLogoImages,
  uploadDisciplineCover,
  uploadDisciplineLogo,
  type DisciplineBucketImage,
} from '../../../lib/discipline-images';

export function DisciplineImagePicker({
  open,
  currentUrl,
  kind = 'cover',
  align = 'left',
  placement = 'bottom',
  onSelect,
  onClose,
}: {
  open: boolean;
  currentUrl: string;
  kind?: 'logo' | 'cover';
  align?: 'left' | 'right';
  placement?: 'top' | 'bottom';
  onSelect: (url: string) => void;
  onClose: () => void;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [images, setImages] = useState<DisciplineBucketImage[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const folderLabel = kind === 'logo' ? 'logo' : 'cover';

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    setError('');
    const load = kind === 'logo' ? listDisciplineLogoImages : listDisciplineCoverImages;
    void load().then((rows) => {
      if (cancelled) return;
      setImages(rows);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [open, kind]);

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', onPointer);
    return () => document.removeEventListener('mousedown', onPointer);
  }, [open, onClose]);

  const handleUpload = async (file: File | undefined) => {
    if (!file) return;
    setUploading(true);
    setError('');
    const result = kind === 'logo' ? await uploadDisciplineLogo(file) : await uploadDisciplineCover(file);
    setUploading(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    const rows = kind === 'logo' ? await listDisciplineLogoImages() : await listDisciplineCoverImages();
    setImages(rows);
    onSelect(result.url);
  };

  if (!open) return null;

  return (
    <div
      ref={panelRef}
      className={`absolute z-30 w-[228px] rounded-2xl border border-[#D4CDB5]/70 bg-white p-2 shadow-xl ${
        placement === 'top' ? 'bottom-full mb-2' : 'top-full mt-2'
      } ${align === 'right' ? 'right-0' : 'left-0'}`}
      role="listbox"
      aria-label={kind === 'logo' ? 'Discipline logos' : 'Discipline covers'}
    >
      {loading ? (
        <div className="flex items-center justify-center gap-2 py-6 text-[#8A7E6E]">
          <Loader2 size={14} className="animate-spin" />
          <span className="text-xs">Loading images…</span>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-4 gap-1.5">
            <button
              type="button"
              aria-label={`Upload ${folderLabel} to disciplines_images/${folderLabel}`}
              disabled={uploading}
              onClick={() => fileInputRef.current?.click()}
              className="aspect-square overflow-hidden rounded-lg border border-dashed border-[#c49a3c]/50 bg-[#c49a3c]/08 text-[#a67f2e] transition-all hover:border-[#c49a3c] hover:bg-[#c49a3c]/12 disabled:opacity-60"
            >
              {uploading ? (
                <Loader2 size={16} className="mx-auto animate-spin" />
              ) : (
                <span className="flex h-full flex-col items-center justify-center gap-0.5">
                  <ImagePlus size={16} />
                  <span className="text-[8px] font-bold uppercase tracking-wide">Upload</span>
                </span>
              )}
            </button>
            {images.map((image) => {
              const selected = isDisciplineBucketImageUrl(currentUrl) && currentUrl.split('?')[0] === image.url;
              return (
                <button
                  key={image.path}
                  type="button"
                  role="option"
                  aria-selected={selected}
                  aria-label={`Select discipline ${folderLabel}`}
                  onClick={() => {
                    onSelect(image.url);
                    onClose();
                  }}
                  className={`relative aspect-square overflow-hidden rounded-lg border transition-all ${
                    selected
                      ? 'border-[#c49a3c] ring-2 ring-[#c49a3c]/40'
                      : 'border-[#D4CDB5]/70 hover:border-[#c49a3c]/50'
                  }`}
                >
                  <img src={image.url} alt="" className="h-full w-full object-cover" />
                  {selected && (
                    <span className="absolute right-0.5 top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-[#c49a3c] text-white">
                      <Check size={10} strokeWidth={3} />
                    </span>
                  )}
                </button>
              );
            })}
          </div>
          {error && (
            <p className="mt-2 px-1 text-[11px] leading-relaxed text-red-600">{error}</p>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="hidden"
            onChange={(event) => {
              void handleUpload(event.target.files?.[0]);
              event.target.value = '';
            }}
          />
        </>
      )}
    </div>
  );
}
