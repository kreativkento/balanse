import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { Newspaper, Tag } from 'lucide-react';
import { useStaffAuth } from '../context/StaffAuthContext';
import { BULLETIN_CATEGORIES, useBulletinPosts, type BulletinCategory, type BulletinPost } from '../../lib/bulletin';
import {
  BulletinCard,
  BulletinDetailModal,
  BulletinSocialButtons,
} from './BulletinPage';

export default function StaffBulletinPage() {
  const navigate = useNavigate();
  const { staffUser } = useStaffAuth();
  const { posts, loading } = useBulletinPosts({ approvedOnly: true });
  const [activeCategory, setActiveCategory] = useState<BulletinCategory>('All');
  const [search, setSearch] = useState('');
  const [selectedPost, setSelectedPost] = useState<BulletinPost | null>(null);

  useEffect(() => {
    if (!staffUser) navigate('/staff-login');
  }, [staffUser, navigate]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return posts.filter((n) => {
      const matchCat = activeCategory === 'All' || n.category === activeCategory;
      const matchSearch =
        !query ||
        n.title.toLowerCase().includes(query) ||
        n.excerpt.toLowerCase().includes(query);
      return matchCat && matchSearch;
    });
  }, [activeCategory, posts, search]);

  const pinned = filtered.filter((n) => n.pinned);
  const regular = filtered.filter((n) => !n.pinned);

  if (!staffUser) return null;

  return (
    <>
      {selectedPost && <BulletinDetailModal post={selectedPost} onClose={() => setSelectedPost(null)} />}

      <div className="min-h-full bg-[#F8F3E8]">
        <div className="mx-auto w-full max-w-6xl px-4 py-8 md:px-8">
          <div className="mb-6 flex flex-col gap-4 pt-2 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <p className="mb-1 text-xs uppercase tracking-widest text-[#8A7E6E]">Community</p>
              <h2
                className="leading-tight text-[#1E2A35]"
                style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 'clamp(1.4rem, 3vw, 1.9rem)', letterSpacing: '0.04em' }}
              >
                Staff Bulletin
              </h2>
              <p className="mt-1 max-w-xl text-sm text-[#8A7E6E]">
                Studio announcements, staff notes, and updates shared with your role.
              </p>
            </div>
            <BulletinSocialButtons />
          </div>

          <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap gap-2">
              {BULLETIN_CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setActiveCategory(cat)}
                  className={`rounded-full border px-4 py-2 text-xs font-semibold transition-all ${
                    activeCategory === cat
                      ? 'border-[#1E2A35] bg-[#1E2A35] text-white'
                      : 'border-[#D4CDB5]/60 bg-white text-[#5A5048] hover:border-[#c49a3c]/40'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search bulletin…"
              className="w-full rounded-full border border-[#D4CDB5]/60 bg-white px-4 py-2.5 text-sm text-[#1E2A35] outline-none placeholder-[#C0B8A8] transition-all focus:border-[#c49a3c]/50 focus:ring-2 focus:ring-[#c49a3c]/20 sm:w-64"
            />
          </div>

          {pinned.length > 0 && (
            <div className="mb-8">
              <p className="mb-4 flex items-center gap-1.5 text-xs uppercase tracking-widest text-[#8A7E6E]">
                <Tag size={11} /> Featured
              </p>
              <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
                {pinned.map((post) => (
                  <BulletinCard key={post.id} post={post} onClick={() => setSelectedPost(post)} featured />
                ))}
              </div>
            </div>
          )}

          {regular.length > 0 && (
            <div>
              {pinned.length > 0 && (
                <p className="mb-4 text-xs uppercase tracking-widest text-[#8A7E6E]">All Posts</p>
              )}
              <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
                {regular.map((post) => (
                  <BulletinCard key={post.id} post={post} onClick={() => setSelectedPost(post)} />
                ))}
              </div>
            </div>
          )}

          {filtered.length === 0 && (
            <div className="py-16 text-center">
              <Newspaper size={32} className="mx-auto mb-3 text-[#c49a3c]/40" />
              <p className="text-[#9A8E7E]">
                {loading ? 'Loading bulletin posts…' : 'No bulletin posts found matching your filters.'}
              </p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
