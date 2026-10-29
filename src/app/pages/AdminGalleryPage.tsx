import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { Images, Pencil, Trash2, X, Check, Upload, Star, Home, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { useAdminAuth } from '../context/AdminAuthContext';
import { PortalTitleToolbar } from '../context/PortalChromeContext';
import { PageLoadingScreen } from '../components/layout/PageLoadingScreen';
import { useAdminUrlSearchQuery } from '../hooks/useAdminUrlSearchFilter';
import { CategorizedAddFilter } from '../components/filters/CategorizedAddFilter';
import { AdminTablePagination, useFitPageSize } from '../components/layout/AdminTablePagination';
import {
  ChronologicalSortSelect,
  sortChronologically,
  type ChronologicalOrder,
} from '../components/layout/ChronologicalSortSelect';
import { IMAGE_HOVER_ZOOM } from '../../lib/motion-classes';
import { GalleryLightbox } from '../components/gallery/GalleryLightbox';
import { GalleryPostFormModal } from '../components/gallery/GalleryPostFormModal';
import {
  createGalleryPost,
  deleteGalleryPost,
  formatGalleryDate,
  loadGalleryPostsForAdmin,
  updateGalleryPost,
  GALLERY_TAGS,
  type GalleryPost,
  type GalleryTag,
} from '../../lib/gallery-service';

const FEATURE_FILTER_OPTIONS = ['gallery', 'home', 'amenities'] as const;
type FeatureFilterOption = (typeof FEATURE_FILTER_OPTIONS)[number];

const FEATURE_FILTER_LABELS: Record<FeatureFilterOption, string> = {
  gallery: 'Studio Gallery',
  home: 'Balance in Motion',
  amenities: 'Amenities',
};

function PhotoCard({
  post,
  onEdit,
  onDelete,
  onView,
}: {
  post: GalleryPost;
  onEdit: () => void;
  onDelete: () => void;
  onView: () => void;
}) {
  const [confirmDel, setConfirmDel] = useState(false);

  const CAT_COLORS: Record<GalleryTag, string> = {
    Studio: 'bg-[#EDE8D8] text-[#5A5048]',
    Classes: 'bg-[#c49a3c]/12 text-[#a67f2e]',
    Events: 'bg-[#3A4A5A]/10 text-[#3A4A5A]',
    Community: 'bg-[#8A9E7A]/15 text-[#5A6E4A]',
    Amenities: 'bg-[#6B8E9E]/15 text-[#3A5A6A]',
  };

  const thumb = post.thumbnailUrl;

  return (
    <div
      data-gallery-card
      className="group relative bg-white rounded-xl border border-[#D4CDB5]/60 shadow-sm overflow-hidden hover:shadow-md h-full flex flex-col"
    >
      <button type="button" onClick={onView} className="relative block w-full overflow-hidden text-left shrink-0">
        {thumb ? (
          post.media[0]?.mediaKind === 'video' ? (
            <video
              src={thumb}
              className={`w-full object-cover ${IMAGE_HOVER_ZOOM} h-32`}
              muted
              playsInline
            />
          ) : (
            <img
              src={thumb}
              alt={post.caption}
              className={`w-full object-cover ${IMAGE_HOVER_ZOOM} h-32`}
            />
          )
        ) : (
          <div className="w-full bg-[#EDE8D8] h-32" />
        )}
        <div className="absolute inset-0 bg-[#1E2A35]/0 group-hover:bg-[#1E2A35]/20 transition-colors" />

        <div className="absolute top-2 left-2 flex flex-wrap gap-1 max-w-[70%]">
          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${CAT_COLORS[post.tag]}`}>
            {post.tag}
          </span>
          {post.media.length > 1 && (
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-white/90 text-[#1E2A35]">
              {post.media.length} items
            </span>
          )}
        </div>

        <div className="absolute bottom-2 left-2 flex flex-wrap gap-0.5 max-w-[85%]">
          {post.featuredInGallery && (
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-[#c49a3c] text-white flex items-center gap-0.5">
              <Star size={8} /> Gallery
            </span>
          )}
          {post.featuredInHomeStudio && post.tag === 'Studio' && (
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-[#1E2A35] text-white flex items-center gap-0.5">
              <Home size={8} /> Home
            </span>
          )}
          {post.featuredInAmenities && post.tag === 'Amenities' && (
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-[#3A5A6A] text-white flex items-center gap-0.5">
              <Sparkles size={8} /> Amenities
            </span>
          )}
        </div>
      </button>

      <div className="absolute top-2.5 right-2.5 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none group-hover:pointer-events-auto z-10">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onEdit();
          }}
          className="w-7 h-7 rounded-xl bg-white/90 backdrop-blur-sm flex items-center justify-center text-[#1E2A35] hover:bg-white shadow-sm transition-all"
        >
          <Pencil size={12} />
        </button>
        {confirmDel ? (
          <>
            <button
              type="button"
              onClick={() => onDelete()}
              className="w-7 h-7 rounded-xl bg-red-500 flex items-center justify-center text-white hover:bg-red-600 shadow-sm"
            >
              <Check size={12} />
            </button>
            <button
              type="button"
              onClick={() => setConfirmDel(false)}
              className="w-7 h-7 rounded-xl bg-white/90 flex items-center justify-center text-[#8A7E6E] hover:bg-white shadow-sm"
            >
              <X size={12} />
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={() => setConfirmDel(true)}
            className="w-7 h-7 rounded-xl bg-white/90 backdrop-blur-sm flex items-center justify-center text-red-500 hover:bg-red-50 shadow-sm transition-all"
          >
            <Trash2 size={12} />
          </button>
        )}
      </div>

      <div className="px-2.5 py-2 flex-1 flex flex-col min-h-0">
        <p className="text-[#1E2A35] text-xs font-medium leading-snug mb-1 line-clamp-2">{post.caption}</p>
        <p className="text-[#B0A898] text-[10px] mt-auto">{formatGalleryDate(post.createdAt)}</p>
      </div>
    </div>
  );
}

export default function AdminGalleryPage() {
  const navigate = useNavigate();
  const { adminUser } = useAdminAuth();

  const urlSearchQuery = useAdminUrlSearchQuery();
  const [posts, setPosts] = useState<GalleryPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTags, setSelectedTags] = useState<GalleryTag[]>([]);
  const [selectedFeatures, setSelectedFeatures] = useState<FeatureFilterOption[]>([]);
  const [tablePage, setTablePage] = useState(1);
  const [chronoOrder, setChronoOrder] = useState<ChronologicalOrder>('latest');
  const [showModal, setShowModal] = useState(false);
  const [editingPost, setEditingPost] = useState<GalleryPost | null>(null);
  const [viewingPost, setViewingPost] = useState<GalleryPost | null>(null);
  const [saving, setSaving] = useState(false);

  const gridRef = useRef<HTMLDivElement>(null);
  const [measuredCardHeight, setMeasuredCardHeight] = useState<number | undefined>(undefined);

  const { containerRef, pageSize } = useFitPageSize({
    fallback: 12,
    layout: 'gallery-card',
    verticalInset: 48,
    itemHeightOverride: measuredCardHeight,
  });

  const refresh = useCallback(async () => {
    setLoading(true);
    const data = await loadGalleryPostsForAdmin();
    setPosts(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!adminUser) navigate('/admin-login');
  }, [adminUser, navigate]);

  useEffect(() => {
    if (adminUser) void refresh();
  }, [adminUser, refresh]);

  useEffect(() => {
    setTablePage(1);
  }, [selectedTags, selectedFeatures, urlSearchQuery, chronoOrder]);

  const filtered = useMemo(() => {
    const q = urlSearchQuery.trim().toLowerCase();
    const matched = posts.filter((p) => {
      const matchTag = selectedTags.length === 0 || selectedTags.includes(p.tag);
      const matchFeature =
        selectedFeatures.length === 0
          || (selectedFeatures.includes('gallery') && p.featuredInGallery)
          || (selectedFeatures.includes('home') && p.featuredInHomeStudio && p.tag === 'Studio')
          || (selectedFeatures.includes('amenities') && p.featuredInAmenities && p.tag === 'Amenities');
      const matchQuery =
        !q
        || p.caption.toLowerCase().includes(q)
        || p.tag.toLowerCase().includes(q);
      return matchTag && matchFeature && matchQuery;
    });
    return sortChronologically(matched, (post) => post.createdAt, chronoOrder);
  }, [posts, selectedTags, selectedFeatures, urlSearchQuery, chronoOrder]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(tablePage, totalPages);
  const rangeStart = filtered.length === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const rangeEnd = Math.min(currentPage * pageSize, filtered.length);
  const pagedPosts = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  useLayoutEffect(() => {
    if (loading || pagedPosts.length === 0) return;
    const grid = gridRef.current;
    if (!grid) return;

    const measure = () => {
      const cards = grid.querySelectorAll<HTMLElement>('[data-gallery-card]');
      let maxHeight = 0;
      cards.forEach((el) => {
        maxHeight = Math.max(maxHeight, el.getBoundingClientRect().height);
      });
      if (maxHeight > 0) {
        setMeasuredCardHeight((prev) => (prev === maxHeight ? prev : maxHeight));
      }
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(grid);
    grid.querySelectorAll('[data-gallery-card]').forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [loading, pagedPosts.length, pageSize, currentPage]);

  const openUpload = () => {
    setEditingPost(null);
    setShowModal(true);
  };

  const openEdit = (post: GalleryPost) => {
    setEditingPost(post);
    setShowModal(true);
  };

  if (!adminUser) return null;

  const handleSave = async (payload: Parameters<typeof createGalleryPost>[0]) => {
    setSaving(true);
    const result = editingPost
      ? await updateGalleryPost(editingPost.id, payload)
      : await createGalleryPost(payload);
    setSaving(false);

    if ('error' in result) {
      toast.error(result.error);
      return;
    }

    toast.success(editingPost ? 'Post updated.' : 'Post created.');
    setShowModal(false);
    setEditingPost(null);
    await refresh();
  };

  const handleDelete = async (id: string) => {
    const { error } = await deleteGalleryPost(id);
    if (error) {
      toast.error(error);
      return;
    }
    toast.success('Post deleted.');
    await refresh();
  };

  return (
    <>
      {showModal && (
        <GalleryPostFormModal
          initial={editingPost}
          allPosts={posts}
          saving={saving}
          onClose={() => {
            if (!saving) {
              setShowModal(false);
              setEditingPost(null);
            }
          }}
          onSubmit={handleSave}
        />
      )}

      {viewingPost && <GalleryLightbox post={viewingPost} onClose={() => setViewingPost(null)} />}

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className="max-w-8xl mx-auto px-6 w-full flex-1 min-h-0 flex flex-col pb-4 pt-1">
          <PortalTitleToolbar>
                <CategorizedAddFilter
                  groups={[
                    {
                      id: 'tag',
                      label: 'Tags',
                      options: GALLERY_TAGS.map((tag) => ({ value: tag, label: tag })),
                    },
                    {
                      id: 'feature',
                      label: 'Featured in',
                      options: FEATURE_FILTER_OPTIONS.map((value) => ({
                        value,
                        label: FEATURE_FILTER_LABELS[value],
                      })),
                    },
                  ]}
                  selected={{ tag: selectedTags, feature: selectedFeatures }}
                  onChange={(next) => {
                    setSelectedTags((next.tag ?? []) as GalleryTag[]);
                    setSelectedFeatures((next.feature ?? []) as FeatureFilterOption[]);
                  }}
                />
                <ChronologicalSortSelect value={chronoOrder} onChange={setChronoOrder} />
                <button
                  type="button"
                  onClick={openUpload}
                  className="action-button ml-auto flex items-center justify-center gap-2 bg-[#1E2A35] text-white px-5 py-2.5 rounded-full hover:bg-[#263545] active:scale-[0.97] transition-all shadow-sm shrink-0"
                >
                  <Upload size={15} /> Add Media
                </button>
          </PortalTitleToolbar>
          <div className="bg-white rounded-3xl border border-[#D4CDB5]/60 shadow-sm overflow-hidden flex-1 min-h-0 flex flex-col">
            <div
              ref={containerRef}
              className="relative flex-1 min-h-0 overflow-hidden"
            >
              {loading && (
                <PageLoadingScreen overlay variant="cards" message="Loading gallery" />
              )}

              {!loading && filtered.length === 0 ? (
                <div className="px-6 py-14 text-center h-full flex flex-col items-center justify-center">
                  <div className="w-14 h-14 rounded-2xl bg-[#F8F3E8] border border-[#D4CDB5]/60 flex items-center justify-center mb-4">
                    <Images size={24} className="text-[#c49a3c]/60" />
                  </div>
                  <p className="text-[#1E2A35] text-sm font-semibold">
                    {selectedTags.length === 0 && selectedFeatures.length === 0
                      ? 'No gallery posts'
                      : 'No matching posts'}
                  </p>
                  <p className="text-[#B0A898] text-xs mt-1 max-w-sm">
                    {posts.length === 0
                      ? 'Create your first gallery post with photos or videos.'
                      : 'Switch filters or add a new post.'}
                  </p>
                  {posts.length === 0 && (
                    <button
                      type="button"
                      onClick={openUpload}
                      className="action-button mt-4 inline-flex items-center gap-2 bg-[#1E2A35] text-white px-5 py-2.5 rounded-full text-sm"
                    >
                      <Upload size={15} /> Add Media
                    </button>
                  )}
                </div>
              ) : (
                !loading && (
                  <div
                    ref={gridRef}
                    className="p-6 h-full min-h-0 grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3 content-start"
                  >
                    {pagedPosts.map((post) => (
                      <PhotoCard
                        key={post.id}
                        post={post}
                        onEdit={() => openEdit(post)}
                        onDelete={() => handleDelete(post.id)}
                        onView={() => setViewingPost(post)}
                      />
                    ))}
                  </div>
                )
              )}
            </div>

            {!loading && filtered.length > 0 && (
              <div className="px-6 pb-4 shrink-0 border-t border-[#D4CDB5]/40 pt-3">
                <AdminTablePagination
                  page={currentPage}
                  totalPages={totalPages}
                  rangeStart={rangeStart}
                  rangeEnd={rangeEnd}
                  total={filtered.length}
                  noun="posts"
                  onPageChange={setTablePage}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
