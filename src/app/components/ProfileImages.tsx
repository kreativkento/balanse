import { useRef, useState, useEffect } from 'react';
import { Camera, ImagePlus, Loader2 } from 'lucide-react';
import { uploadProfileImage, type ProfileImageKind } from '../../lib/storage-service';

export function ProfileAvatar({
  src,
  initials,
  alt = '',
  className = '',
  initialsClassName = '',
}: {
  src?: string;
  initials: string;
  alt?: string;
  className?: string;
  initialsClassName?: string;
}) {
  const [failed, setFailed] = useState(false);
  const showImg = Boolean(src) && !failed;

  useEffect(() => {
    setFailed(false);
  }, [src]);

  return (
    <div className={`overflow-hidden flex items-center justify-center ${className}`}>
      {showImg ? (
        <img
          src={src}
          alt={alt}
          className="h-full w-full object-cover"
          onError={() => setFailed(true)}
        />
      ) : (
        <span className={initialsClassName}>{initials}</span>
      )}
    </div>
  );
}

export function ProfileImageHero({
  photoUrl,
  coverUrl,
  initials,
  accent = '#745b3c',
  editable = false,
  onPhotoUploaded,
  onCoverUploaded,
}: {
  photoUrl: string;
  coverUrl: string;
  initials: string;
  accent?: string;
  editable?: boolean;
  onPhotoUploaded?: (url: string) => void;
  onCoverUploaded?: (url: string) => void;
}) {
  const photoInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState<ProfileImageKind | null>(null);
  const [error, setError] = useState('');
  const [photoFailed, setPhotoFailed] = useState(false);
  const [coverFailed, setCoverFailed] = useState(false);

  useEffect(() => {
    setPhotoFailed(false);
  }, [photoUrl]);

  useEffect(() => {
    setCoverFailed(false);
  }, [coverUrl]);

  const pickFile = (kind: ProfileImageKind) => {
    if (!editable || uploading) return;
    if (kind === 'photo') photoInputRef.current?.click();
    else coverInputRef.current?.click();
  };

  const handleFile = async (kind: ProfileImageKind, file: File | undefined) => {
    if (!file) return;
    setError('');
    setUploading(kind);

    const result = await uploadProfileImage(kind, file);
    setUploading(null);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    if (kind === 'photo') {
      setPhotoFailed(false);
      onPhotoUploaded?.(result.url);
    } else {
      setCoverFailed(false);
      onCoverUploaded?.(result.url);
    }
  };

  const showCover = Boolean(coverUrl) && !coverFailed;
  const showPhoto = Boolean(photoUrl) && !photoFailed;

  return (
    <div className="relative">
      <div className="relative h-36 md:h-40 overflow-hidden" style={{ backgroundColor: `${accent}20` }}>
        {showCover ? (
          <img
            src={coverUrl}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
            onError={() => setCoverFailed(true)}
          />
        ) : (
          <div
            className="absolute inset-0"
            style={{ background: `linear-gradient(135deg, ${accent}35 0%, ${accent}08 100%)` }}
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/25 via-transparent to-black/10" />
        <div className="absolute bottom-0 left-0 right-0 h-[3px]" style={{ backgroundColor: accent }} />

        {editable && (
          <>
            {!showCover && (
              <button
                type="button"
                onClick={() => pickFile('cover')}
                disabled={uploading !== null}
                className="absolute inset-0 z-[5] flex flex-col items-center justify-center gap-1 bg-black/10 hover:bg-black/20 transition-colors"
                aria-label="Add cover image"
              >
                {uploading === 'cover' ? (
                  <Loader2 size={18} className="animate-spin text-white" />
                ) : (
                  <>
                    <ImagePlus size={18} className="text-white" />
                    <span className="text-[11px] font-bold uppercase tracking-wide text-white">Add cover</span>
                  </>
                )}
              </button>
            )}
            <button
              type="button"
              onClick={() => pickFile('cover')}
              disabled={uploading !== null}
              className="absolute top-3 right-3 z-10 flex items-center gap-1.5 rounded-xl bg-white/85 px-2.5 py-1.5 text-[11px] font-bold uppercase tracking-wide text-[#5A5048] shadow-sm backdrop-blur-sm transition-all hover:bg-white disabled:opacity-60"
            >
              {uploading === 'cover' ? <Loader2 size={12} className="animate-spin" /> : <ImagePlus size={12} />}
              {coverUrl ? 'Change cover' : 'Add cover'}
            </button>
            <input
              ref={coverInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="hidden"
              onChange={(e) => {
                void handleFile('cover', e.target.files?.[0]);
                e.target.value = '';
              }}
            />
          </>
        )}
      </div>

      <button
        type="button"
        onClick={() => pickFile('photo')}
        disabled={!editable || uploading !== null}
        aria-label={editable ? 'Change profile photo' : 'Profile photo'}
        className={`absolute bottom-0 left-6 md:left-8 z-10 h-24 w-24 md:h-28 md:w-28 translate-y-1/2 overflow-hidden rounded-2xl border-4 border-white shadow-lg ${
          editable ? 'group cursor-pointer hover:brightness-95 hover:ring-2 hover:ring-[#745b3c]/40 active:scale-[0.98]' : 'cursor-default'
        }`}
        style={{ backgroundColor: `${accent}18` }}
      >
        {showPhoto ? (
          <img
            src={photoUrl}
            alt="Profile"
            className="h-full w-full object-cover"
            onError={() => setPhotoFailed(true)}
          />
        ) : (
          <span
            className="flex h-full w-full items-center justify-center"
            style={{
              fontFamily: "'Bebas Neue', sans-serif",
              fontSize: '2rem',
              letterSpacing: '0.08em',
              color: accent,
            }}
          >
            {initials}
          </span>
        )}
        {editable && (
          <div className={`absolute inset-0 flex flex-col items-center justify-center gap-0.5 bg-black/40 transition-opacity ${
            uploading === 'photo' ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
          }`}>
            {uploading === 'photo' ? (
              <Loader2 size={16} className="animate-spin text-white" />
            ) : (
              <>
                <Camera size={14} className="text-white" />
                <span className="text-[9px] font-bold tracking-wide text-white">EDIT</span>
              </>
            )}
          </div>
        )}
      </button>
      {editable && (
        <input
          ref={photoInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          className="hidden"
          onChange={(e) => {
            void handleFile('photo', e.target.files?.[0]);
            e.target.value = '';
          }}
        />
      )}

      {error && (
        <p className="absolute bottom-2 left-3 right-28 z-10 rounded-lg bg-white/90 px-2 py-1 text-[11px] font-medium text-red-600 shadow-sm">
          {error}
        </p>
      )}
    </div>
  );
}

export function AccountImagesCard({
  name,
  email,
  roleLabel,
  photoUrl,
  coverUrl,
  initials,
  accent = '#745b3c',
  onPhotoUploaded,
  onCoverUploaded,
}: {
  name: string;
  email: string;
  roleLabel: string;
  photoUrl: string;
  coverUrl: string;
  initials: string;
  accent?: string;
  onPhotoUploaded: (url: string) => void;
  onCoverUploaded: (url: string) => void;
}) {
  return (
    <div className="overflow-hidden rounded-3xl border border-[#D4CDB5]/60 bg-white shadow-sm">
      <ProfileImageHero
        photoUrl={photoUrl}
        coverUrl={coverUrl}
        initials={initials}
        accent={accent}
        editable
        onPhotoUploaded={onPhotoUploaded}
        onCoverUploaded={onCoverUploaded}
      />
      <div className="px-6 pb-5 pt-14 md:px-8 md:pt-16">
        <h2
          className="text-[#1E2A35] leading-tight"
          style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.6rem', letterSpacing: '0.04em' }}
        >
          {name}
        </h2>
        <p className="text-[#8A7E6E] text-sm">{email}</p>
        <span className="mt-1.5 inline-flex items-center rounded-full border border-[#745b3c]/25 bg-[#745b3c]/10 px-2.5 py-1 text-xs font-bold text-[#5e4a30]">
          {roleLabel}
        </span>
        <p className="mt-3 text-[#B0A898] text-xs leading-relaxed">
          Profile photo and cover are stored in the shared <span className="font-semibold">profile_images</span> bucket. JPG, PNG, WEBP, or GIF · 5 MB max.
        </p>
      </div>
    </div>
  );
}

