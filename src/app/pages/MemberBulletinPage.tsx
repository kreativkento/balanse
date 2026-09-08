import { useMemo, useState } from 'react';
import { Newspaper, Tag } from 'lucide-react';
import { MemberPageShell } from '../components/layout/MemberPageShell';
import {
  BULLETIN_CATEGORIES,
  BULLETIN_POSTS,
  BulletinCard,
  BulletinDetailModal,
  BulletinSocialButtons,
  type BulletinCategory,
  type BulletinPost,
} from './BulletinPage';

export default function MemberBulletinPage() {
  const [activeCategory, setActiveCategory] = useState<BulletinCategory>('All');
  const [search, setSearch] = useState('');
  const [selectedPost, setSelectedPost] = useState<BulletinPost | null>(null);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return BULLETIN_POSTS.filter((n) => {
      const matchCat = activeCategory === 'All' || n.category === activeCategory;
      const matchSearch =
        !query ||
        n.title.toLowerCase().includes(query) ||
        n.excerpt.toLowerCase().includes(query);
      return matchCat && matchSearch;
    });
  }, [activeCategory, search]);

  const pinned = filtered.filter((n) => n.pinned);
  const regular = filtered.filter((n) => !n.pinned);

  return (
    <>
      {selectedPost && <BulletinDetailModal post={selectedPost} onClose={() => setSelectedPost(null)} />}

      <MemberPageShell searchPlaceholder="Search bulletin…" onSearch={setSearch}>
        <div className="pt-6 mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <p className="text-[#8A7E6E] text-xs uppercase tracking-widest mb-1">Community</p>
            <h2
              className="text-[#1E2A35] leading-tight"
              style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 'clamp(1.4rem, 3vw, 1.9rem)', letterSpacing: '0.04em' }}
            >
              Community Bulletin
            </h2>
            <p className="text-[#8A7E6E] text-sm mt-1 max-w-xl">
              Stay updated on upcoming events, special promos, and studio announcements.
            </p>
          </div>
          <BulletinSocialButtons />
        </div>

        <div className="flex flex-wrap gap-2 mb-8">
          {BULLETIN_CATEGORIES.map((cat) => (
            <button
              key={cat}
              type="button"
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
            <p className="text-[#9A8E7E]">No bulletin posts found matching your filters.</p>
          </div>
        )}
      </MemberPageShell>
    </>
  );
}
