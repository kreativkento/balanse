import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { Images, Newspaper, Sparkles } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { loadGalleryPostsForAdmin } from '../../lib/gallery-service';
import { fetchAdminStudioAmenitiesSelection } from '../../lib/studio-amenities-service';
import { ALL_STUDIO_AMENITY_LABELS } from '../data/studio-amenities';
import AdminBulletinPage from './AdminBulletinPage';
import { CardInfoButton } from '../components/balanse-flow/CardInfoButton';

function MarketingStat({
  to,
  label,
  value,
  hint,
}: {
  to: string;
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <Link
      to={to}
      className="min-w-0 rounded-2xl border border-[#D4CDB5]/55 bg-white px-4 py-3 shadow-sm transition-colors hover:border-[#c49a3c]/40 hover:bg-[#FBF9F3]"
    >
      <p className="truncate text-[10px] font-semibold uppercase tracking-widest text-[#9A8E7E]">
        {label}
        <CardInfoButton title={label} />
      </p>
      <p
        className="mt-1 truncate leading-none text-[#1E2A35]"
        style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.5rem', letterSpacing: '0.04em' }}
      >
        {value}
      </p>
      {hint ? <p className="mt-1 truncate text-[11px] text-[#B0A898]">{hint}</p> : null}
    </Link>
  );
}

function MarketingOverviewStrip() {
  const [loading, setLoading] = useState(true);
  const [bulletinTotal, setBulletinTotal] = useState(0);
  const [bulletinPending, setBulletinPending] = useState(0);
  const [galleryCount, setGalleryCount] = useState(0);
  const [amenitiesOn, setAmenitiesOn] = useState(0);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const [allPosts, pendingPosts, gallery, amenities] = await Promise.all([
        supabase.from('bulletin_posts').select('*', { count: 'exact', head: true }),
        supabase
          .from('bulletin_posts')
          .select('*', { count: 'exact', head: true })
          .eq('admin_approved', false),
        loadGalleryPostsForAdmin(),
        fetchAdminStudioAmenitiesSelection(),
      ]);
      if (cancelled) return;
      setBulletinTotal(allPosts.count ?? 0);
      setBulletinPending(pendingPosts.count ?? 0);
      setGalleryCount(gallery.length);
      setAmenitiesOn(amenities.labels.length);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="mx-auto mb-2 grid w-full max-w-8xl grid-cols-2 gap-2.5 px-6 pt-4 lg:grid-cols-4">
      <MarketingStat
        to="/marketing-dashboard"
        label="Bulletin posts"
        value={loading ? '—' : String(bulletinTotal)}
        hint={loading ? undefined : `${bulletinPending} awaiting approval`}
      />
      <MarketingStat
        to="/marketing-gallery"
        label="Gallery posts"
        value={loading ? '—' : String(galleryCount)}
      />
      <MarketingStat
        to="/marketing-amenities"
        label="Amenities on"
        value={loading ? '—' : `${amenitiesOn}/${ALL_STUDIO_AMENITY_LABELS.length}`}
      />
      <div className="grid grid-cols-1 gap-2">
        <Link
          to="/marketing-gallery"
          className="inline-flex items-center gap-2 rounded-2xl border border-[#D4CDB5]/55 bg-white px-3 py-2 text-xs font-semibold text-[#1E2A35] shadow-sm hover:bg-[#F8F3E8]"
        >
          <Images size={14} className="text-[#c49a3c]" />
          Open gallery
        </Link>
        <Link
          to="/marketing-amenities"
          className="inline-flex items-center gap-2 rounded-2xl border border-[#D4CDB5]/55 bg-white px-3 py-2 text-xs font-semibold text-[#1E2A35] shadow-sm hover:bg-[#F8F3E8]"
        >
          <Sparkles size={14} className="text-[#c49a3c]" />
          Edit amenities
        </Link>
        <Link
          to="/marketing-dashboard"
          className="inline-flex items-center gap-2 rounded-2xl border border-[#D4CDB5]/55 bg-white px-3 py-2 text-xs font-semibold text-[#1E2A35] shadow-sm hover:bg-[#F8F3E8]"
        >
          <Newspaper size={14} className="text-[#c49a3c]" />
          Manage bulletin
        </Link>
      </div>
    </div>
  );
}

export default function MarketingDashboardPage() {
  return (
    <>
      <MarketingOverviewStrip />
      <AdminBulletinPage />
    </>
  );
}
