import { X } from 'lucide-react';
import type { GalleryPost } from '../../../lib/gallery-service';
import { GalleryMediaCarousel } from './GalleryMediaCarousel';

export function GalleryLightbox({
  post,
  onClose,
}: {
  post: GalleryPost;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(30,42,53,0.65)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}
      role="presentation"
    >
      <div
        className="bg-white rounded-3xl border border-[#D4CDB5]/60 shadow-2xl w-full max-w-3xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={post.caption}
      >
        <div className="relative bg-[#1E2A35]">
          <GalleryMediaCarousel
            media={post.media}
            alt={post.caption}
            className="w-full"
            itemClassName="w-full max-h-[70vh] object-contain bg-black mx-auto"
          />
          <button
            type="button"
            onClick={onClose}
            className="absolute top-3 right-3 w-9 h-9 rounded-xl bg-white/90 backdrop-blur-sm flex items-center justify-center text-[#1E2A35] hover:bg-white shadow-sm"
            aria-label="Close"
          >
            <X size={16} />
          </button>
          {post.media.length > 1 && (
            <p className="absolute bottom-3 left-1/2 -translate-x-1/2 text-white/90 text-xs bg-[#1E2A35]/70 px-3 py-1 rounded-full">
              {post.media.length} items — swipe or use arrows
            </p>
          )}
        </div>
        <div className="px-6 py-4">
          <p className="text-[#1E2A35] text-sm font-medium leading-snug">{post.caption}</p>
          <p className="text-[#B0A898] text-xs mt-1">{post.tag}</p>
        </div>
      </div>
    </div>
  );
}
