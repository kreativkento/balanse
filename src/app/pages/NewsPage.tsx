import { useState } from 'react';
import { Newspaper, Tag, Calendar, ChevronRight, Search, X } from 'lucide-react';
import { CARD_HOVER_GROW } from '../../lib/motion-classes';

// ── Mock news data (in production this comes from the admin panel) ──

interface NewsPost {
  id: number;
  title: string;
  category: 'Event' | 'Promo' | 'Announcement' | 'Update';
  excerpt: string;
  body: string;
  date: string;
  imageColor: string;
  badgeColor: string;
  badgeText: string;
  pinned?: boolean;
}

const NEWS: NewsPost[] = [
  {
    id: 1,
    title: 'Summer Grand Open Mat — Free Community Session!',
    category: 'Event',
    excerpt: 'Join us this June 21 for a free open mat event celebrating the summer solstice. All fitness levels welcome.',
    body: `Celebrate summer with BALANSÉ! On June 21, we're opening our studio doors for a free Community Open Mat session from 8:00 AM to 11:00 AM. Expect a fun-filled morning of mixed movement classes, partner drills, and a light refreshment break. Bring a friend and experience BALANSÉ together.`,
    date: 'Jun 5, 2026',
    imageColor: '#C49A3C',
    badgeColor: 'bg-[#C49A3C]/12 text-[#A67E2A]',
    badgeText: 'Event',
    pinned: true,
  },
  {
    id: 2,
    title: 'Referral Promo: Bring a Friend, Get 20% Off',
    category: 'Promo',
    excerpt: `Refer a new member this July and both of you get 20% off your next month's membership. Valid until July 31.`,
    body: `We're celebrating our growing community! When you refer a new member who signs up for a Gold or Silver membership in July 2026, both you and your friend will receive 20% off your next billing cycle. No limits on referrals — the more friends you bring, the more you save!`,
    date: 'Jul 1, 2026',
    imageColor: '#6B8E6B',
    badgeColor: 'bg-green-100 text-green-700',
    badgeText: 'Promo',
    pinned: true,
  },
  {
    id: 3,
    title: 'New Class: Capoeira Beginners — Starting August',
    category: 'Announcement',
    excerpt: `We're launching a dedicated Capoeira Beginners track this August, coached by Rex. Sign up now to reserve your spot.`,
    body: 'Exciting news! Starting August 4, we are introducing a beginner-friendly Capoeira track every Monday and Thursday at 6:00 PM. Coach Rex will guide new students through the fundamentals of movement, music, and Ginga. Class size is limited to 10 — reserve your spot through the booking system.',
    date: 'Jul 15, 2026',
    imageColor: '#A07050',
    badgeColor: 'bg-amber-100 text-amber-700',
    badgeText: 'Announcement',
  },
  {
    id: 4,
    title: 'Studio Renovation: Temporary Schedule Adjustments',
    category: 'Update',
    excerpt: 'Studio 2 will be temporarily unavailable July 28–30 for flooring upgrades. Some classes will move to Studio 1.',
    body: `We're investing in a better experience for you! Studio 2 will undergo flooring upgrades from July 28 to July 30, 2026. During this period, all affected classes will be rescheduled to Studio 1 or the outdoor courtyard. Specific schedule adjustments will be reflected on the class calendar. We apologize for the inconvenience and appreciate your patience.`,
    date: 'Jul 20, 2026',
    imageColor: '#3A4A5A',
    badgeColor: 'bg-[#3A4A5A]/10 text-[#3A4A5A]',
    badgeText: 'Update',
  },
  {
    id: 5,
    title: 'Silver Membership Flash Sale — This Weekend Only',
    category: 'Promo',
    excerpt: 'Get the Silver Membership at ₱2,800/month (save ₱800!) when you sign up July 26–27. Limited slots.',
    body: 'This weekend only — July 26 and 27 — sign up for a Silver Membership at the special rate of ₱2,800/month instead of the regular ₱3,600/month. This offer is available to new members only, and only while slots last. Lock in your rate and start your wellness journey with BALANSÉ today!',
    date: 'Jul 24, 2026',
    imageColor: '#9A7A8A',
    badgeColor: 'bg-pink-100 text-pink-700',
    badgeText: 'Promo',
    pinned: true,
  },
  {
    id: 6,
    title: 'Coach Jodi Returns from International Yoga Retreat',
    category: 'Announcement',
    excerpt: 'Coach Jodi is back! She spent three weeks training in Bali and will be bringing new sequences to our Yoga program.',
    body: `We're thrilled to welcome Coach Jodi back! She recently completed a 21-day immersive yoga teacher training retreat in Ubud, Bali. Expect fresh flows, deeper breath-work techniques, and new restorative sequences in her upcoming Yoga classes. Her first class back is Monday, August 3 at 8:00 AM.`,
    date: 'Jul 27, 2026',
    imageColor: '#8B6F5A',
    badgeColor: 'bg-orange-100 text-orange-700',
    badgeText: 'Announcement',
  },
];

const CATEGORIES = ['All', 'Event', 'Promo', 'Announcement', 'Update'] as const;
type Category = typeof CATEGORIES[number];

function NewsDetailModal({ post, onClose }: { post: NewsPost; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(30,42,53,0.55)', backdropFilter: 'blur(4px)' }}>
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden">
        <div className="px-7 pt-6 pb-5 border-b border-[#D4CDB5]/50 flex items-start justify-between gap-4">
          <div>
            <span className={`inline-block text-xs font-bold px-2.5 py-0.5 rounded-full mb-2 ${post.badgeColor}`}>{post.badgeText}</span>
            <h2 className="text-[#1E2A35] leading-tight" style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.6rem', letterSpacing: '0.04em' }}>{post.title}</h2>
            <p className="text-[#9A8E7E] text-xs mt-1 flex items-center gap-1"><Calendar size={11} /> {post.date}</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-xl text-[#8A7E6E] hover:bg-[#EDE8D8] flex items-center justify-center transition-all shrink-0">
            <X size={15} />
          </button>
        </div>
        <div className="px-7 py-6">
          <p className="text-[#5A5048] text-sm leading-relaxed">{post.body}</p>
        </div>
        <div className="px-7 pb-7">
          <button
            onClick={onClose}
            className="w-full py-3 bg-[#1E2A35] text-white rounded-full hover:bg-[#263545] active:scale-[0.97] transition-all"
            style={{ fontFamily: "'Bebas Neue', sans-serif", letterSpacing: '0.08em' }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export default function NewsPage() {
  const [activeCategory, setActiveCategory] = useState<Category>('All');
  const [search, setSearch] = useState('');
  const [selectedPost, setSelectedPost] = useState<NewsPost | null>(null);

  const filtered = NEWS.filter(n => {
    const matchCat = activeCategory === 'All' || n.category === activeCategory;
    const matchSearch = n.title.toLowerCase().includes(search.toLowerCase()) || n.excerpt.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  const pinned = filtered.filter(n => n.pinned);
  const regular = filtered.filter(n => !n.pinned);

  return (
    <div className="bg-[#F8F3E8] min-h-screen">
      {selectedPost && <NewsDetailModal post={selectedPost} onClose={() => setSelectedPost(null)} />}

      <div className="max-w-6xl mx-auto px-4 md:px-8 py-10">

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-2">
            <Newspaper size={16} className="text-[#C49A3C]" />
            <span className="text-[#8A7E6E] text-xs uppercase tracking-widest">Latest from BALANSÉ</span>
          </div>
          <h1 className="text-[#1E2A35] leading-tight" style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 'clamp(2.5rem, 6vw, 4rem)', letterSpacing: '0.04em' }}>
            News &amp; Updates
          </h1>
          <p className="text-[#8A7E6E] text-sm mt-1 max-w-xl">Stay updated on upcoming events, special promos, and studio announcements.</p>
        </div>

        {/* Filters */}
        <div className="flex flex-col md:flex-row items-start md:items-center gap-4 mb-8">
          <div className="flex gap-2 flex-wrap">
            {CATEGORIES.map(cat => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-4 py-2 rounded-full text-xs font-semibold border transition-all ${
                  activeCategory === cat
                    ? 'bg-[#1E2A35] text-white border-[#1E2A35]'
                    : 'bg-white text-[#5A5048] border-[#D4CDB5]/60 hover:border-[#C49A3C]/40'
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
              onChange={e => setSearch(e.target.value)}
              placeholder="Search news..."
              className="w-full pl-9 pr-4 py-2.5 rounded-full border border-[#D4CDB5]/60 bg-white text-[#1E2A35] text-sm outline-none focus:ring-2 focus:ring-[#C49A3C]/20 focus:border-[#C49A3C]/50 transition-all placeholder-[#C0B8A8]"
            />
          </div>
        </div>

        {/* Pinned posts */}
        {pinned.length > 0 && (
          <div className="mb-8">
            <p className="text-[#8A7E6E] text-xs uppercase tracking-widest mb-4 flex items-center gap-1.5">
              <Tag size={11} /> Featured
            </p>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
              {pinned.map(post => (
                <NewsCard key={post.id} post={post} onClick={() => setSelectedPost(post)} featured />
              ))}
            </div>
          </div>
        )}

        {/* Regular posts */}
        {regular.length > 0 && (
          <div>
            {pinned.length > 0 && <p className="text-[#8A7E6E] text-xs uppercase tracking-widest mb-4">All Posts</p>}
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
              {regular.map(post => (
                <NewsCard key={post.id} post={post} onClick={() => setSelectedPost(post)} />
              ))}
            </div>
          </div>
        )}

        {filtered.length === 0 && (
          <div className="text-center py-16">
            <Newspaper size={32} className="text-[#C49A3C]/40 mx-auto mb-3" />
            <p className="text-[#9A8E7E]">No news found matching your filters.</p>
          </div>
        )}
      </div>
    </div>
  );
}

function NewsCard({ post, onClick, featured }: { post: NewsPost; onClick: () => void; featured?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={`bg-white rounded-3xl border border-[#D4CDB5]/60 shadow-sm overflow-hidden text-left hover:shadow-md hover:border-[#C49A3C]/30 active:scale-[0.98] group ${CARD_HOVER_GROW} ${featured ? 'ring-1 ring-[#C49A3C]/20' : ''}`}
    >
      <div className="p-5">
        <div className="flex items-center justify-between mb-3">
          <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${post.badgeColor}`}>{post.badgeText}</span>
          <span className="text-[#B0A898] text-xs flex items-center gap-1"><Calendar size={10} /> {post.date}</span>
        </div>
        <h3 className="text-[#1E2A35] leading-snug mb-2" style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.2rem', letterSpacing: '0.04em' }}>{post.title}</h3>
        <p className="text-[#8A7E6E] text-xs leading-relaxed line-clamp-3">{post.excerpt}</p>
        <div className="flex items-center gap-1 mt-3 text-[#C49A3C] text-xs font-semibold group-hover:gap-2 transition-all">
          Read more <ChevronRight size={12} className="group-hover:translate-x-0.5 transition-transform" />
        </div>
      </div>
    </button>
  );
}
