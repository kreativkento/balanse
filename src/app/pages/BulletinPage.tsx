import { useState } from 'react';
import { Newspaper, Tag, Calendar, ChevronRight, Search, Facebook, Instagram, X, Paperclip } from 'lucide-react';
import {
  BULLETIN_CATEGORIES,
  bulletinDisplayImageUrl,
  type BulletinCategory,
  type BulletinPost,
  useBulletinPosts,
} from '../../lib/bulletin';
import { CARD_HOVER_GROW } from '../../lib/motion-classes';
import { PublicBreadcrumb } from '../components/layout/PublicBreadcrumb';

export type { BulletinCategory, BulletinPost };
export { BULLETIN_CATEGORIES };

export const BULLETIN_SOCIAL_LINKS = [
  {
    label: 'Facebook',
    href: 'https://www.facebook.com/balanse.wellness',
    icon: Facebook,
  },
  {
    label: 'Instagram',
    href: 'https://www.instagram.com/balanse.wellness/?hl=en',
    icon: Instagram,
  },
] as const;

export function BulletinSocialButtons() {
  return (
    <div className="flex shrink-0 items-center justify-end gap-2.5 self-end sm:self-start">
      {BULLETIN_SOCIAL_LINKS.map(({ label, href, icon: Icon }) => (
        <a
          key={label}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={label}
          title={label}
          className="inline-flex items-center gap-2.5 rounded-2xl border border-[#D4CDB5]/60 bg-white px-4 py-3 text-sm font-semibold text-[#5A5048] shadow-sm transition-colors hover:border-[#c49a3c]/40 hover:bg-[#EDE8D8] hover:text-[#1E2A35]"
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#c49a3c]/10 text-[#c49a3c]">
            <Icon size={18} />
          </span>
          {label}
        </a>
      ))}
    </div>
  );
}

export function BulletinDetailModal({ post, onClose }: { post: BulletinPost; onClose: () => void }) {
  const previewImage = bulletinDisplayImageUrl(post);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(30,42,53,0.55)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}
    >
      <div
        className="flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        {previewImage && (
          <div className="relative h-56 w-full shrink-0 overflow-hidden sm:h-72 md:h-80">
            <img src={previewImage} alt="" className="absolute inset-0 h-full w-full object-cover" />
            <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/35 to-transparent" />
          </div>
        )}
        <div className="flex items-start justify-between gap-4 border-b border-[#D4CDB5]/50 px-7 pb-5 pt-6">
          <div className="min-w-0">
            <span className={`mb-2 inline-block rounded-full px-2.5 py-0.5 text-xs font-bold ${post.badgeColor}`}>
              {post.badgeText}
            </span>
            <h2
              className="leading-tight text-[#1E2A35]"
              style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 'clamp(1.7rem, 3vw, 2.2rem)', letterSpacing: '0.04em' }}
            >
              {post.title}
            </h2>
            <p className="mt-1 flex items-center gap-1 text-xs text-[#9A8E7E]">
              <Calendar size={11} /> {post.date}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-[#8A7E6E] transition-all hover:bg-[#EDE8D8]"
          >
            <X size={15} />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-7 py-6">
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-[#5A5048] sm:text-base">{post.body}</p>
          {post.attachmentUrl && (
            <a
              href={post.attachmentUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-5 flex items-center gap-2 rounded-2xl border border-[#D4CDB5]/60 bg-[#F8F3E8] px-4 py-3 text-sm font-semibold text-[#1E2A35] transition-colors hover:border-[#c49a3c]/40 hover:bg-[#EDE8D8]"
            >
              <Paperclip size={14} className="text-[#c49a3c]" />
              {post.attachmentName || 'Download attachment'}
            </a>
          )}
        </div>
        <div className="px-7 pb-7">
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-full bg-[#1E2A35] py-3 text-white transition-all hover:bg-[#263545] active:scale-[0.97]"
            style={{ fontFamily: "'Bebas Neue', sans-serif", letterSpacing: '0.08em' }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export default function BulletinPage() {
  const { posts, loading } = useBulletinPosts({ publicOnly: true, approvedOnly: true });
  const [activeCategory, setActiveCategory] = useState<BulletinCategory>('All');
  const [search, setSearch] = useState('');
  const [selectedPost, setSelectedPost] = useState<BulletinPost | null>(null);

  const filtered = posts.filter((n) => {
    const matchCat = activeCategory === 'All' || n.category === activeCategory;
    const matchSearch =
      n.title.toLowerCase().includes(search.toLowerCase()) ||
      n.excerpt.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  const pinned = filtered.filter((n) => n.pinned);
  const regular = filtered.filter((n) => !n.pinned);

  return (
    <div className="bg-[#F8F3E8] min-h-screen">
      {selectedPost && <BulletinDetailModal post={selectedPost} onClose={() => setSelectedPost(null)} />}

      <div className="max-w-6xl mx-auto px-4 md:px-8 py-10">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <PublicBreadcrumb parent="Our Community" current="Bulletin" parentTo="/bulletin" />
            <h1
              className="text-[#1E2A35] leading-tight"
              style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 'clamp(2.5rem, 6vw, 4rem)', letterSpacing: '0.04em' }}
            >
              Bulletin
            </h1>
            <p className="text-[#8A7E6E] text-sm mt-1 max-w-xl">
              Stay updated on upcoming events, special promos, and studio announcements.
            </p>
          </div>
          <BulletinSocialButtons />
        </div>

        <div className="flex flex-col md:flex-row items-start md:items-center gap-4 mb-8">
          <div className="flex gap-2 flex-wrap">
            {BULLETIN_CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-4 py-2 rounded-full text-xs font-semibold border transition-all ${
                  activeCategory === cat
                    ? 'bg-[#1E2A35] text-white border-[#1E2A35]'
                    : 'bg-white text-[#5A5048] border-[#D4CDB5]/60 hover:border-[#c49a3c]/40'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
          <div className="relative w-full md:w-64">
            <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#B0A898]" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search bulletin..."
              className="w-full pl-9 pr-4 py-2.5 rounded-full border border-[#D4CDB5]/60 bg-white text-[#1E2A35] text-sm outline-none focus:ring-2 focus:ring-[#c49a3c]/20 focus:border-[#c49a3c]/50 transition-all placeholder-[#C0B8A8]"
            />
          </div>
        </div>

        {pinned.length > 0 && (
          <div className="mb-8">
            <p className="text-[#8A7E6E] text-xs uppercase tracking-widest mb-4 flex items-center gap-1.5">
              <Tag size={11} /> Featured
            </p>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
              {pinned.map((post) => (
                <BulletinCard key={post.id} post={post} onClick={() => setSelectedPost(post)} featured />
              ))}
            </div>
          </div>
        )}

        {regular.length > 0 && (
          <div>
            {pinned.length > 0 && (
              <p className="text-[#8A7E6E] text-xs uppercase tracking-widest mb-4">All Posts</p>
            )}
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
              {regular.map((post) => (
                <BulletinCard key={post.id} post={post} onClick={() => setSelectedPost(post)} />
              ))}
            </div>
          </div>
        )}

        {filtered.length === 0 && (
          <div className="text-center py-16">
            <Newspaper size={32} className="text-[#c49a3c]/40 mx-auto mb-3" />
            <p className="text-[#9A8E7E]">
              {loading ? 'Loading bulletin posts…' : 'No bulletin posts found matching your filters.'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export function BulletinCard({
  post,
  onClick,
  featured,
}: {
  post: BulletinPost;
  onClick: () => void;
  featured?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`bg-white rounded-3xl border border-[#D4CDB5]/60 shadow-sm overflow-hidden text-left hover:shadow-md hover:border-[#c49a3c]/30 active:scale-[0.98] group ${CARD_HOVER_GROW} ${featured ? 'ring-1 ring-[#c49a3c]/20' : ''}`}
    >
      {bulletinDisplayImageUrl(post) ? (
        <div className="h-36 w-full overflow-hidden">
          <img src={bulletinDisplayImageUrl(post)} alt="" className="h-full w-full object-cover" />
        </div>
      ) : (
        <div className="h-2 w-full" style={{ backgroundColor: post.imageColor }} />
      )}
      <div className="p-5">
        <div className="flex items-center justify-between mb-3">
          <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${post.badgeColor}`}>{post.badgeText}</span>
          <span className="text-[#B0A898] text-xs flex items-center gap-1">
            <Calendar size={10} /> {post.date}
          </span>
        </div>
        <h3
          className="text-[#1E2A35] leading-snug mb-2"
          style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.2rem', letterSpacing: '0.04em' }}
        >
          {post.title}
        </h3>
        <p className="text-[#8A7E6E] text-xs leading-relaxed line-clamp-3">{post.excerpt}</p>
        <div className="flex items-center gap-1 mt-3 text-[#c49a3c] text-xs font-semibold group-hover:gap-2 transition-all">
          Read more <ChevronRight size={12} className="group-hover:translate-x-0.5 transition-transform" />
        </div>
      </div>
    </button>
  );
}
