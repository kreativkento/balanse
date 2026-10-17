import { useMemo, useRef, useState, useCallback } from 'react';
import { Upload, X, Star, Home, Sparkles } from 'lucide-react';
import { Switch } from '../ui/switch';
import {
  AMENITIES_FEATURED_LIMIT,
  GALLERY_CAPTION_MAX,
  GALLERY_FEATURED_LIMIT,
  GALLERY_TAGS,
  countFeaturedAmenitiesPosts,
  countFeaturedGalleryPosts,
  mediaKindForFile,
  validateGalleryFile,
  type GalleryPost,
  type GalleryTag,
} from '../../../lib/gallery-service';

export type GalleryFormPayload = {
  caption: string;
  tag: GalleryTag;
  featuredInGallery: boolean;
  featuredInHomeStudio: boolean;
  featuredInAmenities: boolean;
  newFiles: File[];
  removeMediaIds: string[];
};

type PendingFile = { id: string; file: File; previewUrl: string };

const INP =
  'w-full px-4 py-3 rounded-2xl border border-[#D4CDB5]/70 bg-[#F8F3E8] text-[#1E2A35] text-sm outline-none focus:ring-2 focus:ring-[#c49a3c]/25 focus:border-[#c49a3c]/50 transition-all placeholder-[#C0B8A8]';
const SEL = INP + ' appearance-none cursor-pointer';

export function GalleryPostFormModal({
  initial,
  allPosts,
  onClose,
  onSubmit,
  saving,
}: {
  initial?: GalleryPost | null;
  allPosts: GalleryPost[];
  onClose: () => void;
  onSubmit: (payload: GalleryFormPayload) => Promise<void>;
  saving: boolean;
}) {
  const isEdit = Boolean(initial);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [caption, setCaption] = useState(initial?.caption ?? '');
  const [tag, setTag] = useState<GalleryTag>(initial?.tag ?? 'Studio');
  const [featuredInGallery, setFeaturedInGallery] = useState(initial?.featuredInGallery ?? true);
  const [featuredInHomeStudio, setFeaturedInHomeStudio] = useState(
    initial?.featuredInHomeStudio ?? false,
  );
  const [featuredInAmenities, setFeaturedInAmenities] = useState(
    initial?.featuredInAmenities ?? false,
  );
  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([]);
  const [removedExistingIds, setRemovedExistingIds] = useState<Set<string>>(new Set());
  const [error, setError] = useState('');
  const [dragOver, setDragOver] = useState(false);

  const existingMedia = useMemo(
    () => (initial?.media ?? []).filter((m) => !removedExistingIds.has(m.id)),
    [initial?.media, removedExistingIds],
  );

  const hasMedia = existingMedia.length > 0 || pendingFiles.length > 0;
  const showHomeStudioToggle = tag === 'Studio';
  const showAmenitiesToggle = tag === 'Amenities';

  const excludeId = initial?.id;
  const galleryFeaturedUsed = useMemo(
    () => countFeaturedGalleryPosts(allPosts, excludeId),
    [allPosts, excludeId],
  );
  const amenitiesFeaturedUsed = useMemo(
    () => countFeaturedAmenitiesPosts(allPosts, excludeId),
    [allPosts, excludeId],
  );
  const galleryAlreadyFeatured = initial?.featuredInGallery ?? false;
  const amenitiesAlreadyFeatured = initial?.featuredInAmenities ?? false;
  const galleryAtLimit = galleryFeaturedUsed >= GALLERY_FEATURED_LIMIT && !galleryAlreadyFeatured;
  const amenitiesAtLimit =
    amenitiesFeaturedUsed >= AMENITIES_FEATURED_LIMIT && !amenitiesAlreadyFeatured;

  const trySetFeaturedInGallery = useCallback(
    (checked: boolean) => {
      if (checked && galleryFeaturedUsed >= GALLERY_FEATURED_LIMIT && !galleryAlreadyFeatured) {
        setError(
          `Only ${GALLERY_FEATURED_LIMIT} posts can be featured in the public gallery. Unfeature another post first.`,
        );
        return;
      }
      setError('');
      setFeaturedInGallery(checked);
    },
    [galleryFeaturedUsed, galleryAlreadyFeatured],
  );

  const trySetFeaturedInAmenities = useCallback(
    (checked: boolean) => {
      if (checked && amenitiesFeaturedUsed >= AMENITIES_FEATURED_LIMIT && !amenitiesAlreadyFeatured) {
        setError(
          `Only ${AMENITIES_FEATURED_LIMIT} posts can be featured in the amenities carousel. Unfeature another post first.`,
        );
        return;
      }
      setError('');
      setFeaturedInAmenities(checked);
    },
    [amenitiesFeaturedUsed, amenitiesAlreadyFeatured],
  );

  const addFiles = (files: FileList | File[]) => {
    const list = Array.from(files);
    const next: PendingFile[] = [];
    for (const file of list) {
      const validation = validateGalleryFile(file);
      if (validation) {
        setError(validation);
        return;
      }
      next.push({
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        file,
        previewUrl: URL.createObjectURL(file),
      });
    }
    setError('');
    setPendingFiles((prev) => [...prev, ...next]);
  };

  const removePending = (id: string) => {
    setPendingFiles((prev) => {
      const target = prev.find((p) => p.id === id);
      if (target) URL.revokeObjectURL(target.previewUrl);
      return prev.filter((p) => p.id !== id);
    });
  };

  const removeExisting = (id: string) => {
    setRemovedExistingIds((prev) => new Set(prev).add(id));
  };

  const handleSubmit = async () => {
    if (!caption.trim()) {
      setError('Caption is required.');
      return;
    }
    if (!hasMedia) {
      setError('Add at least one photo or video.');
      return;
    }
    if (featuredInGallery && galleryFeaturedUsed >= GALLERY_FEATURED_LIMIT && !galleryAlreadyFeatured) {
      setError(
        `Only ${GALLERY_FEATURED_LIMIT} posts can be featured in the public gallery. Unfeature another post first.`,
      );
      return;
    }
    if (
      showAmenitiesToggle
      && featuredInAmenities
      && amenitiesFeaturedUsed >= AMENITIES_FEATURED_LIMIT
      && !amenitiesAlreadyFeatured
    ) {
      setError(
        `Only ${AMENITIES_FEATURED_LIMIT} posts can be featured in the amenities carousel. Unfeature another post first.`,
      );
      return;
    }
    setError('');
    await onSubmit({
      caption: caption.trim(),
      tag,
      featuredInGallery,
      featuredInHomeStudio: showHomeStudioToggle ? featuredInHomeStudio : false,
      featuredInAmenities: showAmenitiesToggle ? featuredInAmenities : false,
      newFiles: pendingFiles.map((p) => p.file),
      removeMediaIds: [...removedExistingIds],
    });
  };

  const previewItems = [
    ...existingMedia.map((m) => ({
      key: m.id,
      kind: m.mediaKind,
      url: m.url,
      label: 'Saved',
      onRemove: () => removeExisting(m.id),
    })),
    ...pendingFiles.map((p, index) => ({
      key: p.id,
      kind: mediaKindForFile(p.file) ?? 'image',
      url: p.previewUrl,
      label: index === 0 && !existingMedia.length ? 'Thumbnail' : 'New',
      onRemove: () => removePending(p.id),
    })),
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(30,42,53,0.5)', backdropFilter: 'blur(4px)' }}
    >
      <div className="bg-white rounded-3xl border border-[#D4CDB5]/60 shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="px-7 pt-7 pb-5 border-b border-[#D4CDB5]/50 flex items-center justify-between sticky top-0 bg-white z-10">
          <h3
            className="text-[#1E2A35]"
            style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.5rem', letterSpacing: '0.05em' }}
          >
            {isEdit ? 'Edit Gallery Post' : 'Create Gallery Post'}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-xl text-[#8A7E6E] hover:bg-[#EDE8D8] flex items-center justify-center transition-all"
          >
            <X size={16} />
          </button>
        </div>

        <div className="px-7 py-6 flex flex-col gap-4">
          <div>
            <label className="block text-[#8A7E6E] text-xs uppercase tracking-widest mb-1.5">
              Photos & videos
            </label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,video/quicktime,.jpg,.jpeg,.png,.webp,.gif,.mp4,.webm,.mov"
              multiple
              className="hidden"
              onChange={(e) => {
                if (e.target.files?.length) addFiles(e.target.files);
                e.target.value = '';
              }}
            />
            <div
              role="button"
              tabIndex={0}
              onClick={() => fileInputRef.current?.click()}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  fileInputRef.current?.click();
                }
              }}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragOver(false);
                if (e.dataTransfer.files.length) addFiles(e.dataTransfer.files);
              }}
              className={`flex flex-col items-center justify-center rounded-2xl border-2 border-dashed cursor-pointer transition-all py-8 px-4 ${
                dragOver
                  ? 'border-[#c49a3c] bg-[#c49a3c]/06'
                  : 'border-[#D4CDB5]/70 bg-[#F8F3E8]/50 hover:border-[#c49a3c]/40 hover:bg-[#c49a3c]/04'
              }`}
            >
              <div className="w-12 h-12 rounded-2xl bg-[#EDE8D8] border border-[#D4CDB5]/60 flex items-center justify-center mb-3">
                <Upload size={22} className="text-[#9A8E7E]" />
              </div>
              <p className="text-[#1E2A35] text-sm">Drag & drop or click to add media</p>
              <p className="text-[#B0A898] text-[11px] mt-2 text-center">
                First item is the thumbnail. Multiple items show as a carousel when viewing.
              </p>
            </div>

            {previewItems.length > 0 && (
              <div className="mt-3 grid grid-cols-3 gap-2">
                {previewItems.map((item, index) => (
                  <div key={item.key} className="relative rounded-xl overflow-hidden border border-[#D4CDB5]/60 aspect-square bg-[#EDE8D8]">
                    {item.kind === 'video' ? (
                      <video src={item.url} className="w-full h-full object-cover" muted playsInline />
                    ) : (
                      <img src={item.url} alt="" className="w-full h-full object-cover" />
                    )}
                    {index === 0 && (
                      <span className="absolute top-1 left-1 text-[9px] font-bold uppercase tracking-wide bg-[#c49a3c] text-white px-1.5 py-0.5 rounded-md">
                        Thumb
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={item.onRemove}
                      className="absolute top-1 right-1 w-6 h-6 rounded-lg bg-white/90 flex items-center justify-center text-[#8A7E6E] hover:text-red-500"
                      aria-label="Remove"
                    >
                      <X size={10} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <label className="block text-[#8A7E6E] text-xs uppercase tracking-widest mb-1.5">Caption</label>
            <textarea
              value={caption}
              onChange={(e) => setCaption(e.target.value.slice(0, GALLERY_CAPTION_MAX))}
              placeholder="Describe this post…"
              rows={2}
              className={INP + ' resize-none'}
            />
          </div>

          <div>
            <label className="block text-[#8A7E6E] text-xs uppercase tracking-widest mb-1.5">Tag</label>
            <select value={tag} onChange={(e) => setTag(e.target.value as GalleryTag)} className={SEL}>
              {GALLERY_TAGS.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-3 rounded-2xl border border-[#D4CDB5]/50 bg-[#F8F3E8]/40 px-4 py-3">
            <label className="flex items-center justify-between gap-3 text-sm text-[#5A5048]">
              <span className="flex flex-col gap-0.5 min-w-0">
                <span className="flex items-center gap-2">
                  <Star size={14} className="text-[#c49a3c] shrink-0" />
                  Feature in gallery (public studio page)
                </span>
                <span className="text-[11px] text-[#B0A898] pl-6">
                  {galleryFeaturedUsed + (featuredInGallery ? 1 : 0)} of {GALLERY_FEATURED_LIMIT} slots used
                </span>
              </span>
              <Switch
                checked={featuredInGallery}
                onCheckedChange={trySetFeaturedInGallery}
                disabled={galleryAtLimit && !featuredInGallery}
                className="data-[state=checked]:bg-[#c49a3c] data-[state=unchecked]:bg-[#D4CDB5] shrink-0"
              />
            </label>
            {galleryAtLimit && (
              <p className="text-[11px] text-amber-800 bg-amber-50 border border-amber-200/80 rounded-xl px-3 py-2">
                Gallery limit reached ({GALLERY_FEATURED_LIMIT} posts). Turn off “feature in gallery” on another
                post to feature this one.
              </p>
            )}
            {showHomeStudioToggle && (
              <label className="flex items-center justify-between gap-3 text-sm text-[#5A5048]">
                <span className="flex items-center gap-2">
                  <Home size={14} className="text-[#c49a3c]" />
                  Feature in home studio section
                </span>
                <Switch
                  checked={featuredInHomeStudio}
                  onCheckedChange={setFeaturedInHomeStudio}
                  className="data-[state=checked]:bg-[#c49a3c] data-[state=unchecked]:bg-[#D4CDB5]"
                />
              </label>
            )}
            {showAmenitiesToggle && (
              <>
                <label className="flex items-center justify-between gap-3 text-sm text-[#5A5048]">
                  <span className="flex flex-col gap-0.5 min-w-0">
                    <span className="flex items-center gap-2">
                      <Sparkles size={14} className="text-[#c49a3c] shrink-0" />
                      Feature in amenities carousel (studio page)
                    </span>
                    <span className="text-[11px] text-[#B0A898] pl-6">
                      {amenitiesFeaturedUsed + (featuredInAmenities ? 1 : 0)} of {AMENITIES_FEATURED_LIMIT} slots
                      used
                    </span>
                  </span>
                  <Switch
                    checked={featuredInAmenities}
                    onCheckedChange={trySetFeaturedInAmenities}
                    disabled={amenitiesAtLimit && !featuredInAmenities}
                    className="data-[state=checked]:bg-[#c49a3c] data-[state=unchecked]:bg-[#D4CDB5] shrink-0"
                  />
                </label>
                {amenitiesAtLimit && (
                  <p className="text-[11px] text-amber-800 bg-amber-50 border border-amber-200/80 rounded-xl px-3 py-2">
                    Amenities carousel limit reached ({AMENITIES_FEATURED_LIMIT} posts). Unfeature another
                    amenities post to add this one.
                  </p>
                )}
              </>
            )}
            {!showHomeStudioToggle && !showAmenitiesToggle && (
              <p className="text-[11px] text-[#B0A898]">
                Tag-specific featuring is available for Studio (home) and Amenities (carousel).
              </p>
            )}
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3">
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          )}
        </div>

        <div className="px-7 pb-7 flex gap-3 sticky bottom-0 bg-white border-t border-[#D4CDB5]/40 pt-5">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="flex-1 py-3 rounded-full border border-[#D4CDB5]/70 text-[#8A7E6E] text-sm hover:bg-[#EDE8D8] transition-all disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={saving || !hasMedia}
            className="action-button flex-1 py-3 rounded-full bg-[#1E2A35] text-white hover:bg-[#263545] active:scale-[0.97] transition-all shadow-sm disabled:opacity-40 disabled:pointer-events-none"
          >
            {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Publish Post'}
          </button>
        </div>
      </div>
    </div>
  );
}
