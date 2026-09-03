import { useEffect, useState } from 'react';
import {
  Accessibility,
  Activity,
  ArrowUpDown,
  Car,
  ChevronLeft,
  ChevronRight,
  Coffee,
  CreditCard,
  Droplets,
  Dumbbell,
  Flower2,
  Footprints,
  Lock,
  MapPin,
  Navigation,
  Phone,
  ShieldCheck,
  Shirt,
  ShowerHead,
  Snowflake,
  Sofa,
  Sparkles,
  Target,
  Users,
  Volume2,
  Waves,
  Wifi,
  Wind,
  X,
  type LucideIcon,
} from 'lucide-react';
import { CARD_HOVER_GROW, HOVER_FADE_UP, IMAGE_HOVER_ZOOM } from '../../lib/motion-classes';
import { PublicBreadcrumb } from '../components/layout/PublicBreadcrumb';

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

const AMENITY_GROUPS: { title: string; items: { icon: LucideIcon; label: string }[] }[] = [
  {
    title: 'Studio & equipment',
    items: [
      { icon: Footprints, label: 'Yoga mats & props provided' },
      { icon: Dumbbell, label: 'Free weights & kettlebells' },
      { icon: Activity, label: 'Reformer & mat Pilates gear' },
      { icon: Target, label: 'Boxing bags & gloves' },
      { icon: Waves, label: 'Cushioned movement flooring' },
      { icon: Volume2, label: 'Studio sound system' },
    ],
  },
  {
    title: 'Comfort & facilities',
    items: [
      { icon: Snowflake, label: 'Air-conditioned studios' },
      { icon: ShowerHead, label: 'Showers & changing rooms' },
      { icon: Lock, label: 'Personal lockers' },
      { icon: Shirt, label: 'Towel service' },
      { icon: Droplets, label: 'Filtered drinking water' },
      { icon: Wind, label: 'Cross-ventilated studios' },
    ],
  },
  {
    title: 'Guest experience',
    items: [
      { icon: Wifi, label: 'Free high-speed Wi-Fi' },
      { icon: Sofa, label: 'Reception lounge' },
      { icon: Flower2, label: 'Quiet mindfulness corner' },
      { icon: Sparkles, label: 'Aromatherapy diffusers' },
      { icon: Users, label: 'Small-group class sizes' },
      { icon: Coffee, label: 'Complimentary herbal tea' },
    ],
  },
  {
    title: 'Getting here',
    items: [
      { icon: Car, label: 'Building parking' },
      { icon: ArrowUpDown, label: 'Elevator access' },
      { icon: Accessibility, label: 'Step-free studio entry' },
      { icon: CreditCard, label: 'Card & e-wallet payments' },
      { icon: ShieldCheck, label: '24/7 building security' },
    ],
  },
];

/** Two per group so the preview spans every category. */
const FEATURED_AMENITIES = AMENITY_GROUPS.flatMap((group) => group.items.slice(0, 2));
const AMENITY_COUNT = AMENITY_GROUPS.reduce((total, group) => total + group.items.length, 0);

function AmenityRow({ icon: Icon, label }: { icon: LucideIcon; label: string }) {
  return (
    <div className="flex items-center gap-3">
      <Icon size={18} className="shrink-0 text-[#c49a3c]" strokeWidth={1.75} />
      <span className="text-[#1E2A35] text-sm leading-snug">{label}</span>
    </div>
  );
}

function AmenitiesModal({ onClose }: { onClose: () => void }) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto p-4"
      style={{ backgroundColor: 'rgba(30,42,53,0.55)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="All studio amenities"
    >
      <div
        className="my-4 w-full max-w-2xl overflow-hidden rounded-3xl bg-white shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 border-b border-[#D4CDB5]/50 px-6 py-5 md:px-8">
          <div>
            <p className="text-[#8A7E6E] text-[0.65rem] uppercase tracking-widest mb-1">Amenities</p>
            <h2
              className="text-[#1E2A35] leading-none"
              style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.6rem', letterSpacing: '0.05em' }}
            >
              What this space offers
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close amenities"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#F8F3E8] text-[#8A7E6E] transition-colors hover:bg-[#EDE8D8] hover:text-[#1E2A35] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#745b3c]/50"
          >
            <X size={16} />
          </button>
        </div>

        <div className="max-h-[60vh] overflow-y-auto px-6 py-5 md:px-8">
          <div className="flex flex-col gap-6">
            {AMENITY_GROUPS.map((group) => (
              <div key={group.title}>
                <p className="text-[#8A7E6E] text-[0.65rem] uppercase tracking-widest mb-3">
                  {group.title}
                </p>
                <div className="flex flex-col">
                  {group.items.map((item) => (
                    <div
                      key={item.label}
                      className="border-b border-[#D4CDB5]/40 py-3 last:border-b-0"
                    >
                      <AmenityRow icon={item.icon} label={item.label} />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
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

export default function StudioPage() {
  const [showMore, setShowMore] = useState(false);
  const [carouselIndex, setCarouselIndex] = useState(0);
  const [amenitiesOpen, setAmenitiesOpen] = useState(false);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setCarouselIndex((current) => (current + 1) % STUDIO_CAROUSEL.length);
    }, 5000);
    return () => window.clearInterval(timer);
  }, []);

  const goToSlide = (index: number) => {
    setCarouselIndex((index + STUDIO_CAROUSEL.length) % STUDIO_CAROUSEL.length);
  };

  const allImages = showMore
    ? [...STUDIO_IMAGES_INITIAL, ...STUDIO_IMAGES_MORE]
    : STUDIO_IMAGES_INITIAL;

  // Column splits
  const buildCols = (images: typeof STUDIO_IMAGES_INITIAL, count: number) =>
    Array.from({ length: count }, (_, i) => images.filter((_, idx) => idx % count === i));

  const [col0, col1, col2, col3] = buildCols(allImages, 4);
  const leftCol = allImages.filter((_, i) => i % 2 === 0);
  const rightCol = allImages.filter((_, i) => i % 2 === 1);

  return (
    <div className="bg-[#F8F3E8] min-h-screen">
      {amenitiesOpen && <AmenitiesModal onClose={() => setAmenitiesOpen(false)} />}

      {/* Header */}
      <div className="border-b border-[#D4CDB5]/60">
        <div className="max-w-6xl mx-auto px-4 md:px-8 pt-5 pb-5">
          <PublicBreadcrumb parent="Our Studio" current="Amenities" parentTo="/studio" />
          <h1
            className="text-[#1E2A35] leading-none"
            style={{
              fontFamily: "'Bebas Neue', sans-serif",
              fontSize: 'clamp(1.8rem, 4vw, 2.8rem)',
              letterSpacing: '0.05em',
            }}
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
                  {STUDIO_CAROUSEL.map((slide, index) => (
                    <img
                      key={slide.src}
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

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => goToSlide(carouselIndex - 1)}
                    aria-label="Previous thumbnail"
                    className="shrink-0 w-8 h-8 flex items-center justify-center text-[#8A7E6E] hover:text-[#1E2A35] transition-colors"
                  >
                    <ChevronLeft size={18} />
                  </button>

                  <div className="flex-1 min-w-0 flex gap-2 overflow-x-auto py-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                    {STUDIO_CAROUSEL.map((slide, index) => (
                      <button
                        key={slide.src}
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

                  <button
                    type="button"
                    onClick={() => goToSlide(carouselIndex + 1)}
                    aria-label="Next thumbnail"
                    className="shrink-0 w-8 h-8 flex items-center justify-center text-[#8A7E6E] hover:text-[#1E2A35] transition-colors"
                  >
                    <ChevronRight size={18} />
                  </button>
                </div>
              </div>

              {/* Studio details */}
              <div className="rounded-3xl border border-[#D4CDB5]/60 bg-white shadow-sm p-4 md:p-5 flex flex-col justify-between gap-4">
                <div>
                  <p className="text-[#8A7E6E] text-[0.65rem] uppercase tracking-widest mb-1">Studio Details</p>
                  <h2
                    className="text-[#1E2A35] leading-none mb-3"
                    style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.45rem', letterSpacing: '0.05em' }}
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
                  style={{
                    fontFamily: "'Bebas Neue', sans-serif",
                    fontSize: 'clamp(1.1rem, 2.5vw, 1.5rem)',
                    letterSpacing: '0.06em',
                  }}
                >
                  What this space offers
                </h2>
                <div className="flex-1 h-px bg-[#D4CDB5]/60" />
              </div>

              <div className="rounded-3xl border border-[#D4CDB5]/60 bg-white shadow-sm p-4 md:p-6">
                <div className="grid grid-cols-1 gap-x-10 gap-y-4 sm:grid-cols-2">
                  {FEATURED_AMENITIES.map((amenity) => (
                    <AmenityRow key={amenity.label} icon={amenity.icon} label={amenity.label} />
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => setAmenitiesOpen(true)}
                  className="mt-5 inline-flex items-center gap-1.5 rounded-full border border-[#D4CDB5]/80 bg-[#F8F3E8] px-4 py-2 text-xs font-semibold text-[#5A5048] transition-all hover:border-[#c49a3c]/40 hover:bg-[#EDE8D8] hover:text-[#1E2A35] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#745b3c]/50"
                >
                  Show all {AMENITY_COUNT} amenities
                  <ChevronRight size={12} className="text-[#c49a3c]" />
                </button>
              </div>
            </section>

            {/* ── Section label ── */}
            <div className="flex items-center gap-3 mb-4 px-1">
              <h2
                className="text-[#1E2A35]"
                style={{
                  fontFamily: "'Bebas Neue', sans-serif",
                  fontSize: 'clamp(1.1rem, 2.5vw, 1.5rem)',
                  letterSpacing: '0.06em',
                }}
              >
                Studio Gallery
              </h2>
              <div className="flex-1 h-px bg-[#D4CDB5]/60" />
            </div>

            {/* Mobile: 2-column masonry */}
            <div className="md:hidden flex gap-3">
              <div className="flex-1 flex flex-col gap-3">
                {leftCol.map((img) => (
                  <div key={img.id} className={`rounded-2xl overflow-hidden bg-[#EDE8D8] relative group shadow-sm ${CARD_HOVER_GROW}`}>
                    <img
                      src={img.url}
                      alt={img.alt}
                      className={`w-full object-cover ${img.tall ? 'h-56' : 'h-40'}`}
                    />
                    <div className="absolute inset-0 bg-[#1E2A35]/0 group-active:bg-[#1E2A35]/10 transition-colors rounded-2xl" />
                  </div>
                ))}
              </div>
              <div className="flex-1 flex flex-col gap-3 mt-6">
                {rightCol.map((img) => (
                  <div key={img.id} className={`rounded-2xl overflow-hidden bg-[#EDE8D8] relative group shadow-sm ${CARD_HOVER_GROW}`}>
                    <img
                      src={img.url}
                      alt={img.alt}
                      className={`w-full object-cover ${img.tall ? 'h-56' : 'h-40'}`}
                    />
                    <div className="absolute inset-0 bg-[#1E2A35]/0 group-active:bg-[#1E2A35]/10 transition-colors rounded-2xl" />
                  </div>
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
                    <div
                      key={img.id}
                      className={`rounded-2xl overflow-hidden bg-[#EDE8D8] relative group shadow-sm cursor-pointer ${CARD_HOVER_GROW}`}
                    >
                      <img
                        src={img.url}
                        alt={img.alt}
                        className={`w-full object-cover ${IMAGE_HOVER_ZOOM} ${
                          img.tall ? 'h-72' : 'h-48'
                        }`}
                      />
                      <div className="absolute inset-0 bg-[#1E2A35]/0 group-hover:bg-[#1E2A35]/20 transition-colors rounded-2xl flex items-end p-4">
                        <p className={`text-white text-sm font-medium opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 ${HOVER_FADE_UP}`}>
                          {img.alt}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>

            {/* ── See More / See Less button ── */}
            <div className="flex justify-center mt-8 mb-2">
              <button
                onClick={() => setShowMore((v) => !v)}
                className="flex items-center gap-2 px-7 py-3 rounded-full border-2 border-[#c49a3c] text-[#c49a3c] hover:bg-[#c49a3c] hover:text-white active:scale-95 transition-all"
                style={{
                  fontFamily: "'Bebas Neue', sans-serif",
                  fontSize: '1rem',
                  letterSpacing: '0.1em',
                }}
              >
                {showMore ? 'See Less' : `See More  (+${STUDIO_IMAGES_MORE.length})`}
              </button>
            </div>

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