import { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, MapPin, Navigation, Phone, X, type LucideIcon } from 'lucide-react';
import { CARD_HOVER_GROW, HOVER_FADE_UP, IMAGE_HOVER_ZOOM } from '../../lib/motion-classes';
import {
  loadPublicAmenitiesCarouselPosts,
  loadPublicGalleryPosts,
  type GalleryPost,
} from '../../lib/gallery-service';
import { GalleryLightbox } from '../components/gallery/GalleryLightbox';
import { PublicBreadcrumb } from '../components/layout/PublicBreadcrumb';
import {
  buildStudioAmenityDisplayGroups,
  flattenStudioAmenityDisplayGroups,
  type StudioAmenityDisplayGroup,
  type StudioAmenityDisplayItem,
} from '../data/studio-amenities';
import { fetchPublicStudioAmenitiesLabels } from '../../lib/studio-amenities-service';

const STUDIO_CAROUSEL = [
  {
    src: 'https://images.unsplash.com/photo-1761971975973-cbb3e59263de?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080',
    alt: 'Morning light in the main studio',
  },
  {
    src: 'https://images.unsplash.com/photo-1699378281595-0d75e9e6a05a?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080',
    alt: 'Reception lounge',
  },
  {
    src: 'https://images.unsplash.com/photo-1761971975724-31001b4de0bf?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080',
    alt: 'Quiet mindfulness corner',
  },
  {
    src: 'https://images.unsplash.com/photo-1767611120077-3697335ec748?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080',
    alt: 'Yoga session in studio',
  },
];

const STUDIO_DETAILS = {
  name: 'BALANSÉ Wellness Hub',
  addressLines: [
    'Capitol Centrum Building, N Escario St',
    'Brgy. Camputhaw, Cebu City, Cebu',
    '6000 Cebu',
  ],
  phoneDisplay: '0917 123 4567',
  phoneHref: 'tel:+639171234567',
  mapsUrl:
    'https://www.google.com/maps/place/Balans%C3%A9/@10.3163126,123.8903472,1109m/data=!3m2!1e3!4b1!4m6!3m5!1s0x33a999b43ce2f4eb:0xbf2bc2b8ba8edbe4!8m2!3d10.3163073!4d123.8929221!16s%2Fg%2F11lmfp9w8b?entry=ttu&g_ep=EgoyMDI2MDgzMS4wIKXMDSoASAFQAw%3D%3D',
};

/** Airbnb listings preview the first 10, then link out to the full list. */
const AMENITY_PREVIEW_LIMIT = 10;

function AmenityRow({ icon: Icon, label }: { icon: LucideIcon; label: string }) {
  return (
    <div className="flex items-center gap-4">
      <Icon size={24} className="shrink-0 text-[#1E2A35]" strokeWidth={1.5} />
      <span className="text-[#1E2A35] text-base leading-snug">{label}</span>
    </div>
  );
}

function AmenitiesModal({
  groups,
  onClose,
}: {
  groups: StudioAmenityDisplayGroup[];
  onClose: () => void;
}) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center overflow-y-auto bg-[#1E2A35]/55 p-0 backdrop-blur-[2px] sm:items-center sm:p-6"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="All studio amenities"
    >
      <div
        className="flex max-h-[92vh] w-full max-w-[720px] flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:max-h-[min(820px,90vh)] sm:rounded-3xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="shrink-0 border-b border-[#D4CDB5]/50 px-6 pb-5 pt-5 md:px-8">
          <button
            type="button"
            onClick={onClose}
            aria-label="Close amenities"
            className="mb-5 flex h-8 w-8 items-center justify-center rounded-full border border-[#1E2A35]/80 text-[#1E2A35] transition-colors hover:bg-[#F8F3E8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#745b3c]/50"
          >
            <X size={16} />
          </button>
          <h2
            className="text-[#1E2A35] leading-none"
            style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '2rem', letterSpacing: '0.04em' }}
          >
            What this space offers
          </h2>
        </div>

        <div className="overflow-y-auto px-6 py-2 md:px-8">
          {groups.map((group) => (
            <section key={group.title} className="border-b border-[#E8E2D4] py-6 last:border-b-0">
              <h3 className="mb-1 text-base font-semibold text-[#1E2A35]">{group.title}</h3>
              <ul>
                {group.items.map((item) => (
                  <li
                    key={item.label}
                    className="border-b border-[#E8E2D4] py-4 last:border-b-0"
                  >
                    <AmenityRow icon={item.icon} label={item.label} />
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}

const STUDIO_IMAGES_INITIAL = [
  {
    id: 1,
    url: 'https://images.unsplash.com/photo-1761971975973-cbb3e59263de?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=800',
    alt: 'Yoga studio main space',
    tall: true,
  },
  {
    id: 2,
    url: 'https://images.unsplash.com/photo-1767611120077-3697335ec748?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=800',
    alt: 'Yoga meditation session',
    tall: false,
  },
  {
    id: 3,
    url: 'https://images.unsplash.com/photo-1637157216470-d92cd2edb2e8?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=800',
    alt: 'Mat Pilates class',
    tall: false,
  },
  {
    id: 4,
    url: 'https://images.unsplash.com/photo-1699378281595-0d75e9e6a05a?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=800',
    alt: 'Wellness serene space',
    tall: true,
  },
  {
    id: 5,
    url: 'https://images.unsplash.com/photo-1686133368810-24f662f65cad?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=800',
    alt: 'Kickboxing training',
    tall: false,
  },
  {
    id: 6,
    url: 'https://images.unsplash.com/photo-1759352856072-985a4ddab82d?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=800',
    alt: 'Capoeira session',
    tall: false,
  },
  {
    id: 7,
    url: 'https://images.unsplash.com/photo-1717500252780-036bfd89f810?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=800',
    alt: 'Animal Flow movement',
    tall: true,
  },
  {
    id: 8,
    url: 'https://images.unsplash.com/photo-1602827114685-efbb2717da9f?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=800',
    alt: 'Circuit Training class',
    tall: false,
  },
];

const GALLERY_INITIAL_COUNT = 8;

type StudioGalleryTile = {
  id: string;
  url: string;
  alt: string;
  tall: boolean;
  post?: GalleryPost;
};

const STUDIO_IMAGES_MORE = [
  {
    id: 9,
    url: 'https://images.unsplash.com/photo-1761971975724-31001b4de0bf?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=800',
    alt: 'Meditation calm space',
    tall: false,
  },
  {
    id: 10,
    url: 'https://images.unsplash.com/photo-1583166614297-a97b68d5cead?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=800',
    alt: 'Capoeira art in motion',
    tall: true,
  },
  {
    id: 11,
    url: 'https://images.unsplash.com/photo-1758875569414-120ebc62ada3?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=800',
    alt: 'Personal coaching session',
    tall: false,
  },
  {
    id: 12,
    url: 'https://images.unsplash.com/photo-1701824429245-ce783f1dc026?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=800',
    alt: 'Groundworks floor movement',
    tall: false,
  },
];

function staticGalleryTiles(): StudioGalleryTile[] {
  return [...STUDIO_IMAGES_INITIAL, ...STUDIO_IMAGES_MORE].map((img) => ({
    id: String(img.id),
    url: img.url,
    alt: img.alt,
    tall: img.tall,
  }));
}

function postsToTiles(posts: GalleryPost[]): StudioGalleryTile[] {
  return posts.map((post) => ({
    id: post.id,
    url: post.thumbnailUrl ?? '',
    alt: post.caption,
    tall: post.masonryTall,
    post,
  }));
}

type CarouselSlide = { src: string; alt: string; post?: GalleryPost };

function postsToCarouselSlides(posts: GalleryPost[]): CarouselSlide[] {
  return posts.map((post) => ({
    src: post.thumbnailUrl ?? '',
    alt: post.caption,
    post,
  }));
}

export default function StudioPage() {
  const [showMore, setShowMore] = useState(false);
  const [carouselIndex, setCarouselIndex] = useState(0);
  const [amenitiesOpen, setAmenitiesOpen] = useState(false);
  const [galleryPosts, setGalleryPosts] = useState<GalleryPost[]>([]);
  const [amenitiesPosts, setAmenitiesPosts] = useState<GalleryPost[]>([]);
  const [amenityGroups, setAmenityGroups] = useState<StudioAmenityDisplayGroup[]>([]);
  const [viewingPost, setViewingPost] = useState<GalleryPost | null>(null);

  useEffect(() => {
    void loadPublicGalleryPosts().then(setGalleryPosts);
    void loadPublicAmenitiesCarouselPosts().then(setAmenitiesPosts);
    void fetchPublicStudioAmenitiesLabels().then((labels) => {
      setAmenityGroups(buildStudioAmenityDisplayGroups(labels));
    });
  }, []);

  const allAmenities: StudioAmenityDisplayItem[] = useMemo(
    () => flattenStudioAmenityDisplayGroups(amenityGroups),
    [amenityGroups],
  );
  const previewAmenities = allAmenities.slice(0, AMENITY_PREVIEW_LIMIT);
  const amenityCount = allAmenities.length;
  const hasMoreAmenities = amenityCount > AMENITY_PREVIEW_LIMIT;

  const carouselSlides: CarouselSlide[] = amenitiesPosts.length
    ? postsToCarouselSlides(amenitiesPosts)
    : STUDIO_CAROUSEL.map((slide) => ({ src: slide.src, alt: slide.alt }));

  useEffect(() => {
    setCarouselIndex((current) =>
      carouselSlides.length ? Math.min(current, carouselSlides.length - 1) : 0,
    );
  }, [carouselSlides.length]);

  useEffect(() => {
    if (!carouselSlides.length) return;
    const timer = window.setInterval(() => {
      setCarouselIndex((current) => (current + 1) % carouselSlides.length);
    }, 5000);
    return () => window.clearInterval(timer);
  }, [carouselSlides.length]);

  const goToSlide = (index: number) => {
    if (!carouselSlides.length) return;
    setCarouselIndex((index + carouselSlides.length) % carouselSlides.length);
  };

  const dynamicTiles = galleryPosts.length ? postsToTiles(galleryPosts) : staticGalleryTiles();
  const extraCount = Math.max(0, dynamicTiles.length - GALLERY_INITIAL_COUNT);
  const allImages = showMore ? dynamicTiles : dynamicTiles.slice(0, GALLERY_INITIAL_COUNT);

  // Column splits
  const buildCols = (images: StudioGalleryTile[], count: number) =>
    Array.from({ length: count }, (_, i) => images.filter((_, idx) => idx % count === i));

  const [col0, col1, col2, col3] = buildCols(allImages, 4);
  const leftCol = allImages.filter((_, i) => i % 2 === 0);
  const rightCol = allImages.filter((_, i) => i % 2 === 1);

  const openTile = (tile: StudioGalleryTile) => {
    if (tile.post) setViewingPost(tile.post);
  };

  return (
    <div className="bg-[#F8F3E8] min-h-screen">
      {amenitiesOpen && (
        <AmenitiesModal groups={amenityGroups} onClose={() => setAmenitiesOpen(false)} />
      )}
      {viewingPost && <GalleryLightbox post={viewingPost} onClose={() => setViewingPost(null)} />}

      {/* Header */}
      <div className="border-b border-[#D4CDB5]/60">
        <div className="max-w-6xl mx-auto px-4 md:px-8 pt-5 pb-5">
          <PublicBreadcrumb parent="Our Studio" current="Amenities" parentTo="/studio" />
          <h1
            className="text-[#1E2A35] leading-none"
            style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 'clamp(1.8rem, 4vw, 2.8rem)',
              letterSpacing: '0.04em' }}
          >
            Amenities
          </h1>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-3 md:px-8 py-4 md:py-8">
            <section className="mb-6 md:mb-8 grid grid-cols-1 md:grid-cols-[minmax(0,1.7fr)_minmax(0,0.9fr)] gap-4 md:gap-5 items-start">
              {/* Image carousel — main + thumbnails */}
              <div className="flex flex-col gap-3 min-w-0">
                <div className="relative overflow-hidden rounded-3xl border border-[#D4CDB5]/60 shadow-sm bg-[#EDE8D8] aspect-[16/11] md:aspect-[16/10] min-h-[14rem]">
                  {carouselSlides.map((slide, index) => (
                    <img
                      key={slide.post?.id ?? slide.src}
                      src={slide.src}
                      alt={slide.alt}
                      className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-700 ${
                        index === carouselIndex ? 'opacity-100' : 'opacity-0'
                      }`}
                    />
                  ))}
                  <div className="absolute inset-0 bg-gradient-to-t from-[#1E2A35]/25 via-transparent to-transparent pointer-events-none" />

                  <button
                    type="button"
                    onClick={() => goToSlide(carouselIndex - 1)}
                    aria-label="Previous studio photo"
                    className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-[#1E2A35]/80 text-white flex items-center justify-center hover:bg-[#1E2A35] transition-all shadow-sm"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <button
                    type="button"
                    onClick={() => goToSlide(carouselIndex + 1)}
                    aria-label="Next studio photo"
                    className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-[#1E2A35]/80 text-white flex items-center justify-center hover:bg-[#1E2A35] transition-all shadow-sm"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>

                {carouselSlides.length > 0 && (
                  <div className="flex items-center gap-2">
                    {carouselSlides.length > 1 && (
                      <button
                        type="button"
                        onClick={() => goToSlide(carouselIndex - 1)}
                        aria-label="Previous thumbnail"
                        className="shrink-0 w-8 h-8 flex items-center justify-center text-[#8A7E6E] hover:text-[#1E2A35] transition-colors"
                      >
                        <ChevronLeft size={18} />
                      </button>
                    )}

                    <div className="flex-1 min-w-0 flex justify-center">
                      <div className="inline-flex max-w-full gap-2 overflow-x-auto py-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                        {carouselSlides.map((slide, index) => (
                          <button
                            key={slide.post?.id ?? slide.src}
                            type="button"
                            onClick={() => goToSlide(index)}
                            aria-label={`Show studio photo ${index + 1}`}
                            aria-pressed={index === carouselIndex}
                            className={`relative shrink-0 w-[4.5rem] h-[3.25rem] md:w-24 md:h-[4.25rem] rounded-xl overflow-hidden transition-all ${
                              index === carouselIndex
                                ? 'ring-2 ring-[#1E2A35] ring-offset-1 ring-offset-[#F8F3E8]'
                                : 'opacity-80 hover:opacity-100'
                            }`}
                          >
                            <img
                              src={slide.src}
                              alt=""
                              className="absolute inset-0 h-full w-full object-cover"
                            />
                          </button>
                        ))}
                      </div>
                    </div>

                    {carouselSlides.length > 1 && (
                      <button
                        type="button"
                        onClick={() => goToSlide(carouselIndex + 1)}
                        aria-label="Next thumbnail"
                        className="shrink-0 w-8 h-8 flex items-center justify-center text-[#8A7E6E] hover:text-[#1E2A35] transition-colors"
                      >
                        <ChevronRight size={18} />
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Studio details */}
              <div className="rounded-3xl border border-[#D4CDB5]/60 bg-white shadow-sm p-4 md:p-5 flex flex-col justify-between gap-4">
                <div>
                  <p className="text-[#8A7E6E] text-[0.65rem] uppercase tracking-widest mb-1">Studio Details</p>
                  <h2
                    className="text-[#1E2A35] leading-none mb-3"
                    style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.45rem', letterSpacing: '0.04em' }}
                  >
                    {STUDIO_DETAILS.name}
                  </h2>

                  <div className="flex flex-col gap-3">
                    <div className="flex items-start gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-[#F8F3E8] border border-[#D4CDB5]/60 flex items-center justify-center shrink-0 text-[#c49a3c]">
                        <MapPin size={14} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[#8A7E6E] text-[0.6rem] uppercase tracking-widest mb-0.5">Location</p>
                        {STUDIO_DETAILS.addressLines.map((line) => (
                          <p key={line} className="text-[#1E2A35] text-xs leading-snug">
                            {line}
                          </p>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-start gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-[#F8F3E8] border border-[#D4CDB5]/60 flex items-center justify-center shrink-0 text-[#c49a3c]">
                        <Phone size={14} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[#8A7E6E] text-[0.6rem] uppercase tracking-widest mb-0.5">Mobile</p>
                        <a
                          href={STUDIO_DETAILS.phoneHref}
                          className="text-[#1E2A35] text-xs font-semibold hover:text-[#c49a3c] transition-colors"
                        >
                          {STUDIO_DETAILS.phoneDisplay}
                        </a>
                      </div>
                    </div>
                  </div>
                </div>

                <a
                  href={STUDIO_DETAILS.mapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-1.5 self-start rounded-full border border-[#D4CDB5]/80 bg-[#F8F3E8] px-4 py-2 text-xs font-semibold text-[#5A5048] hover:border-[#c49a3c]/40 hover:text-[#1E2A35] hover:bg-[#EDE8D8] transition-all"
                >
                  <Navigation size={12} className="text-[#c49a3c]" />
                  Get Directions
                </a>
              </div>
            </section>

            {/* ── Amenities ── */}
            <section className="mb-6 md:mb-8">
              <div className="flex items-center gap-3 mb-4 px-1">
                <h2
                  className="text-[#1E2A35]"
                  style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 'clamp(1.1rem, 2.5vw, 1.5rem)',
                    letterSpacing: '0.04em' }}
                >
                  What this space offers
                </h2>
                <div className="flex-1 h-px bg-[#D4CDB5]/60" />
              </div>

              <div className="rounded-3xl border border-[#D4CDB5]/60 bg-white shadow-sm p-5 md:p-8">
                <div className="grid grid-cols-1 gap-x-16 gap-y-5 sm:grid-cols-2">
                  {previewAmenities.map((amenity) => (
                    <AmenityRow key={amenity.label} icon={amenity.icon} label={amenity.label} />
                  ))}
                </div>

                {hasMoreAmenities && (
                  <button
                    type="button"
                    onClick={() => setAmenitiesOpen(true)}
                    className="mt-7 inline-flex cursor-pointer items-center text-base font-semibold text-[#1E2A35] underline decoration-[#c49a3c] decoration-2 underline-offset-[6px] transition-colors hover:text-[#a67f2e] hover:decoration-[#a67f2e] focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#745b3c]/50"
                  >
                    Show all {amenityCount} amenities
                  </button>
                )}
              </div>
            </section>

            {/* ── Section label ── */}
            <div className="flex items-center gap-3 mb-4 px-1">
              <h2
                className="text-[#1E2A35]"
                style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 'clamp(1.1rem, 2.5vw, 1.5rem)',
                  letterSpacing: '0.04em' }}
              >
                Studio Gallery
              </h2>
              <div className="flex-1 h-px bg-[#D4CDB5]/60" />
            </div>

            {/* Mobile: 2-column masonry */}
            <div className="md:hidden flex gap-3">
              <div className="flex-1 flex flex-col gap-3">
                {leftCol.map((img) => (
                  <button
                    key={img.id}
                    type="button"
                    onClick={() => openTile(img)}
                    className={`rounded-2xl overflow-hidden bg-[#EDE8D8] relative group shadow-sm ${CARD_HOVER_GROW} ${img.post ? 'cursor-pointer' : ''}`}
                  >
                    <img
                      src={img.url}
                      alt={img.alt}
                      loading="lazy"
                      decoding="async"
                      className={`w-full object-cover ${img.tall ? 'h-56' : 'h-40'}`}
                    />
                    <div className="absolute inset-0 bg-[#1E2A35]/0 group-active:bg-[#1E2A35]/10 transition-colors rounded-2xl" />
                  </button>
                ))}
              </div>
              <div className="flex-1 flex flex-col gap-3 mt-6">
                {rightCol.map((img) => (
                  <button
                    key={img.id}
                    type="button"
                    onClick={() => openTile(img)}
                    className={`rounded-2xl overflow-hidden bg-[#EDE8D8] relative group shadow-sm ${CARD_HOVER_GROW} ${img.post ? 'cursor-pointer' : ''}`}
                  >
                    <img
                      src={img.url}
                      alt={img.alt}
                      loading="lazy"
                      decoding="async"
                      className={`w-full object-cover ${img.tall ? 'h-56' : 'h-40'}`}
                    />
                    <div className="absolute inset-0 bg-[#1E2A35]/0 group-active:bg-[#1E2A35]/10 transition-colors rounded-2xl" />
                  </button>
                ))}
              </div>
            </div>

            {/* Desktop: 4-column masonry grid */}
            <div className="hidden md:flex gap-4">
              {[col0, col1, col2, col3].map((col, colIdx) => (
                <div
                  key={colIdx}
                  className="flex-1 flex flex-col gap-4"
                  style={{ marginTop: colIdx % 2 === 1 ? '2rem' : '0' }}
                >
                  {col.map((img) => (
                    <button
                      key={img.id}
                      type="button"
                      onClick={() => openTile(img)}
                      className={`rounded-2xl overflow-hidden bg-[#EDE8D8] relative group shadow-sm text-left ${img.post ? 'cursor-pointer' : ''} ${CARD_HOVER_GROW}`}
                    >
                      <img
                        src={img.url}
                        alt={img.alt}
                        loading="lazy"
                        decoding="async"
                        className={`w-full object-cover ${IMAGE_HOVER_ZOOM} ${
                          img.tall ? 'h-72' : 'h-48'
                        }`}
                      />
                      <div className="absolute inset-0 bg-[#1E2A35]/0 group-hover:bg-[#1E2A35]/20 transition-colors rounded-2xl flex items-end p-4">
                        <p className={`text-white text-sm font-medium opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 ${HOVER_FADE_UP}`}>
                          {img.alt}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              ))}
            </div>

            {/* ── See More / See Less button ── */}
            {extraCount > 0 && (
              <div className="flex justify-center mt-8 mb-2">
                <button
                  type="button"
                  onClick={() => setShowMore((v) => !v)}
                  className="flex items-center gap-2 px-7 py-3 rounded-full border-2 border-[#c49a3c] text-[#c49a3c] hover:bg-[#c49a3c] hover:text-white active:scale-95 transition-all"
                  style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1rem',
                    letterSpacing: '0.05em' }}
                >
                  {showMore ? 'See Less' : `See More  (+${extraCount})`}
                </button>
              </div>
            )}

            {/* Bottom label */}
            <div className="px-4 pt-4 pb-2 text-center">
              <p className="text-[#B0A898] text-xs italic">
                BALANSÉ Wellness Hub — A space to restore, move &amp; thrive
              </p>
            </div>

      </div>
    </div>
  );
}
