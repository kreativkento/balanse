import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { Calendar, Newspaper, Plus, Upload, X } from 'lucide-react';
import { useAdminAuth } from '../context/AdminAuthContext';
import {
  addBulletinPost,
  BULLETIN_CATEGORIES,
  BULLETIN_POST_TYPES,
  type BulletinCategory,
  type BulletinPostType,
  useBulletinPosts,
} from '../../lib/bulletin';

const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png'];
const ACCEPTED_IMAGE_EXT = /\.(jpe?g|png)$/i;

function isAcceptedImage(file: File) {
  if (ACCEPTED_IMAGE_TYPES.includes(file.type)) return true;
  return ACCEPTED_IMAGE_EXT.test(file.name);
}

const EMPTY_FORM = {
  title: '',
  description: '',
  category: 'Announcement' as BulletinPostType,
  imageUrl: '',
};

/** Single shared container for header, filters, and posts — identical in every filter state. */
const BULLETIN_PAGE_CONTAINER = 'mx-auto w-full min-w-0 max-w-5xl px-6 md:px-8';

function AddPostModal({
  onClose,
  onSave,
}: {
  onClose: () => void;
  onSave: (data: typeof EMPTY_FORM) => void;
}) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const hasPhoto = form.imageUrl.trim().length > 0;

  const applyFile = (file: File) => {
    if (!isAcceptedImage(file)) {
      setError('Please upload a JPG, JPEG, or PNG image.');
      return;
    }
    setError('');
    const reader = new FileReader();
    reader.onload = () => {
      setForm((current) => ({ ...current, imageUrl: String(reader.result ?? '') }));
    };
    reader.readAsDataURL(file);
  };

  const handleSave = () => {
    if (!form.title.trim()) {
      setError('Title is required.');
      return;
    }
    if (!form.description.trim()) {
      setError('Description is required.');
      return;
    }
    if (!form.imageUrl.trim()) {
      setError('Please upload a photo.');
      return;
    }
    onSave(form);
  };

  const INP =
    'w-full px-4 py-3 rounded-2xl border border-[#D4CDB5]/70 bg-[#F8F3E8] text-[#1E2A35] text-sm outline-none focus:ring-2 focus:ring-[#c49a3c]/25 focus:border-[#c49a3c]/50 transition-all placeholder-[#C0B8A8]';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(30,42,53,0.5)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg overflow-hidden rounded-3xl border border-[#D4CDB5]/60 bg-white shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-[#D4CDB5]/50 px-6 pb-4 pt-5">
          <h3
            className="text-[#1E2A35]"
            style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.5rem', letterSpacing: '0.05em' }}
          >
            Add Post
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-xl text-[#8A7E6E] transition-all hover:bg-[#EDE8D8]"
          >
            <X size={16} />
          </button>
        </div>

        <div className="flex flex-col gap-3 px-6 py-4">
          <div>
            <label className="mb-1.5 block text-xs uppercase tracking-widest text-[#8A7E6E]">Title</label>
            <input
              type="text"
              value={form.title}
              onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
              placeholder="Post title…"
              className={INP}
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs uppercase tracking-widest text-[#8A7E6E]">Description</label>
            <textarea
              value={form.description}
              onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
              placeholder="Write the full post description…"
              rows={3}
              className={`${INP} resize-none`}
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs uppercase tracking-widest text-[#8A7E6E]">Category</label>
            <div className="flex flex-wrap gap-2">
              {BULLETIN_POST_TYPES.map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setForm((current) => ({ ...current, category: type }))}
                  className={`rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-all ${
                    form.category === type
                      ? 'border-[#1E2A35] bg-[#1E2A35] text-white'
                      : 'border-[#D4CDB5]/60 bg-white text-[#5A5048] hover:border-[#c49a3c]/40'
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-xs uppercase tracking-widest text-[#8A7E6E]">Photo</label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,.jpg,.jpeg,.png"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) applyFile(file);
                event.target.value = '';
              }}
            />
            <div
              role="button"
              tabIndex={0}
              onClick={() => fileInputRef.current?.click()}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  fileInputRef.current?.click();
                }
              }}
              onDragOver={(event) => {
                event.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(event) => {
                event.preventDefault();
                setDragOver(false);
                const file = event.dataTransfer.files[0];
                if (file) applyFile(file);
              }}
              className={`relative flex cursor-pointer flex-col items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed transition-all ${
                hasPhoto ? 'h-28' : 'h-24 px-4 py-3'
              } ${
                dragOver
                  ? 'border-[#c49a3c] bg-[#c49a3c]/06'
                  : hasPhoto
                    ? 'border-[#D4CDB5]/70 bg-[#F8F3E8]'
                    : error && !hasPhoto
                      ? 'border-red-300 bg-red-50/40'
                      : 'border-[#D4CDB5]/70 bg-[#F8F3E8]/50 hover:border-[#c49a3c]/40 hover:bg-[#c49a3c]/04'
              }`}
            >
              {hasPhoto ? (
                <>
                  <img
                    src={form.imageUrl}
                    alt="Post preview"
                    className="absolute inset-0 h-full w-full object-cover"
                  />
                  <div className="absolute inset-0 flex items-center justify-center bg-[#1E2A35]/0 opacity-0 transition-colors hover:bg-[#1E2A35]/35 hover:opacity-100">
                    <p className="text-xs text-white">Click or drop to replace</p>
                  </div>
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      setForm((current) => ({ ...current, imageUrl: '' }));
                      setError('');
                    }}
                    className="absolute right-2.5 top-2.5 flex h-7 w-7 items-center justify-center rounded-xl bg-white/90 text-[#8A7E6E] shadow-sm backdrop-blur-sm transition-all hover:bg-red-50 hover:text-red-500"
                    aria-label="Remove photo"
                  >
                    <X size={12} />
                  </button>
                </>
              ) : (
                <>
                  <div className="mb-1.5 flex h-9 w-9 items-center justify-center rounded-xl border border-[#D4CDB5]/60 bg-[#EDE8D8]">
                    <Upload size={16} className="text-[#9A8E7E]" />
                  </div>
                  <p className="text-xs text-[#1E2A35]">Drag & drop or click to upload</p>
                  <p className="mt-0.5 text-[11px] text-[#B0A898]">JPG, JPEG, or PNG</p>
                </>
              )}
            </div>
          </div>

          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}
        </div>

        <div className="flex gap-3 border-t border-[#D4CDB5]/40 px-6 pb-5 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-full border border-[#D4CDB5]/70 py-2.5 text-sm text-[#8A7E6E] transition-all hover:bg-[#EDE8D8]"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="flex-1 rounded-full bg-[#1E2A35] py-2.5 text-sm text-white transition-all hover:bg-[#263545] active:scale-[0.97]"
            style={{ fontFamily: "'Bebas Neue', sans-serif", letterSpacing: '0.08em' }}
          >
            Publish Post
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AdminBulletinPage() {
  const navigate = useNavigate();
  const { adminUser } = useAdminAuth();
  const posts = useBulletinPosts();
  const [activeCategory, setActiveCategory] = useState<BulletinCategory>('All');
  const [showAddModal, setShowAddModal] = useState(false);

  useEffect(() => {
    if (!adminUser) navigate('/admin-login');
  }, [adminUser, navigate]);

  const filtered = useMemo(() => {
    return posts.filter((post) => activeCategory === 'All' || post.category === activeCategory);
  }, [posts, activeCategory]);

  const handleSavePost = (data: typeof EMPTY_FORM) => {
    addBulletinPost({
      title: data.title,
      description: data.description,
      category: data.category,
      imageUrl: data.imageUrl,
    });
    setShowAddModal(false);
  };

  if (!adminUser) return null;

  return (
    <>
      {showAddModal && (
        <AddPostModal onClose={() => setShowAddModal(false)} onSave={handleSavePost} />
      )}

      <div className={`${BULLETIN_PAGE_CONTAINER} py-6 md:py-8`}>
        <header className="mb-7 flex w-full min-w-0 items-start justify-between gap-4">
          <div className="min-w-0">
            <span className="text-xs uppercase tracking-widest text-[#8A7E6E]">Admin › Marketing</span>
            <h1
              className="mt-1 text-[#1E2A35]"
              style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '2.2rem', letterSpacing: '0.04em' }}
            >
              Bulletin
            </h1>
            <p className="mt-1 text-sm text-[#8A7E6E]">
              Publish studio announcements and updates for clients.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="flex shrink-0 items-center gap-2 rounded-full bg-[#1E2A35] px-5 py-2.5 text-white shadow-sm transition-all hover:bg-[#263545] active:scale-[0.97]"
            style={{ fontFamily: "'Bebas Neue', sans-serif", letterSpacing: '0.08em', fontSize: '0.9rem' }}
          >
            <Plus size={15} />
            Add Post
          </button>
        </header>

        <div className="mb-6 grid w-full min-w-0 grid-cols-1 items-center gap-3 sm:grid-cols-[minmax(0,1fr)_6rem]">
          <div
            className="w-full min-w-0 rounded-2xl border border-[#D4CDB5]/60 bg-white p-1 shadow-sm"
            role="tablist"
            aria-label="Filter bulletin posts"
          >
            <div className="grid w-full grid-cols-2 gap-1.5 sm:grid-cols-5">
              {BULLETIN_CATEGORIES.map((category) => (
                <button
                  key={category}
                  type="button"
                  role="tab"
                  aria-selected={activeCategory === category}
                  onClick={() => setActiveCategory(category)}
                  className={`w-full rounded-xl px-2 py-1.5 text-center text-xs font-medium transition-all sm:px-3.5 sm:py-1.5 ${
                    activeCategory === category
                      ? 'bg-[#1E2A35] text-white shadow-sm'
                      : 'text-[#8A7E6E] hover:text-[#1E2A35]'
                  }`}
                >
                  {category}
                </button>
              ))}
            </div>
          </div>
          <p className="w-full shrink-0 text-right text-sm tabular-nums text-[#8A7E6E] sm:w-24">
            {filtered.length} post{filtered.length === 1 ? '' : 's'}
          </p>
        </div>

        <section className="w-full min-w-0">
          {filtered.length === 0 ? (
            <div className="flex w-full min-w-0 flex-col items-center gap-3 rounded-3xl border border-[#D4CDB5]/60 bg-white px-8 py-16 text-center shadow-sm">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-[#D4CDB5]/60 bg-[#F8F3E8]">
                <Newspaper size={22} className="text-[#c49a3c]" />
              </div>
              <p className="font-semibold text-[#1E2A35]">No posts yet</p>
              <p className="max-w-sm text-sm text-[#8A7E6E]">
                {activeCategory === 'All'
                  ? 'Create your first bulletin post for members and the public site.'
                  : `No ${activeCategory.toLowerCase()} posts yet. Try another filter or add a new post.`}
              </p>
              <button
                type="button"
                onClick={() => setShowAddModal(true)}
                className="mt-2 inline-flex items-center gap-2 rounded-full border border-[#D4CDB5]/70 bg-white px-4 py-2 text-sm font-semibold text-[#1E2A35] transition-all hover:border-[#c49a3c]/40 hover:bg-[#F8F3E8]"
              >
                <Plus size={14} />
                Add Post
              </button>
            </div>
          ) : (
            <div className="grid w-full min-w-0 grid-cols-1 gap-4">
              {filtered.map((post) => (
                <article
                  key={post.id}
                  className="w-full min-w-0 overflow-hidden rounded-3xl border border-[#D4CDB5]/60 bg-white shadow-sm"
                >
                  <div className="flex w-full min-w-0 flex-col sm:flex-row">
                    <div
                      className="relative h-40 w-full shrink-0 sm:h-auto sm:w-44"
                      style={{ backgroundColor: post.imageColor }}
                    >
                      {post.imageUrl ? (
                        <img src={post.imageUrl} alt="" className="h-full w-full object-cover sm:absolute sm:inset-0" />
                      ) : (
                        <div className="flex h-full items-center justify-center">
                          <Newspaper size={28} className="text-white/70" />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1 p-5">
                      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                        <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${post.badgeColor}`}>
                          {post.badgeText}
                        </span>
                        <span className="flex items-center gap-1 text-xs text-[#B0A898]">
                          <Calendar size={10} />
                          {post.date}
                        </span>
                      </div>
                      <h2
                        className="mb-2 leading-snug text-[#1E2A35]"
                        style={{
                          fontFamily: "'Bebas Neue', sans-serif",
                          fontSize: '1.25rem',
                          letterSpacing: '0.04em',
                        }}
                      >
                        {post.title}
                      </h2>
                      <p className="line-clamp-2 text-sm leading-relaxed text-[#8A7E6E]">{post.excerpt}</p>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </>
  );
}
