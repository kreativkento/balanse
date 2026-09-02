import { useState } from 'react';
import { ChevronLeft, ChevronRight, Play } from 'lucide-react';
import { CARD_HOVER_GROW, HOVER_FADE_UP, ICON_HOVER_GROW, IMAGE_HOVER_ZOOM } from '../../lib/motion-classes';

const STUDIO_VIDEOS = [
  {
    id: 1,
    thumbnail: 'https://images.unsplash.com/photo-1758599880979-f6a64947b541?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080',
    title: 'Flow & Breathe — Yoga Morning Session',
    duration: '3:42',
  },
  {
    id: 2,
    thumbnail: 'https://images.unsplash.com/photo-1603570074851-c1ba8d7def6a?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080',
    title: 'Bodyweight Mastery — Calisthenics Highlights',
    duration: '4:15',
  },
  {
    id: 3,
    thumbnail: 'https://images.unsplash.com/photo-1763403921315-f2ef8697199f?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080',
    title: 'Core & Control — Mat Pilates with Kate',
    duration: '2:58',
  },
  {
    id: 4,
    thumbnail: 'https://images.unsplash.com/photo-1686133369581-3513ce7e394f?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080',
    title: 'Power & Precision — Kickboxing with Wolf',
    duration: '5:01',
  },
];

const GALLERY_IMAGES_INITIAL = [
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

const GALLERY_IMAGES_MORE = [
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

export default function GalleryPage() {
  const [videoIndex, setVideoIndex] = useState(0);
  const [showMore, setShowMore] = useState(false);
  const [playingVideo, setPlayingVideo] = useState<number | null>(null);

  const allImages = showMore
    ? [...GALLERY_IMAGES_INITIAL, ...GALLERY_IMAGES_MORE]
    : GALLERY_IMAGES_INITIAL;

  // Column splits
  const buildCols = (images: typeof GALLERY_IMAGES_INITIAL, count: number) =>
    Array.from({ length: count }, (_, i) => images.filter((_, idx) => idx % count === i));

  const [col0, col1, col2, col3] = buildCols(allImages, 4);
  const leftCol = allImages.filter((_, i) => i % 2 === 0);
  const rightCol = allImages.filter((_, i) => i % 2 === 1);

  const prevVideo = () => setVideoIndex((i) => (i - 1 + STUDIO_VIDEOS.length) % STUDIO_VIDEOS.length);
  const nextVideo = () => setVideoIndex((i) => (i + 1) % STUDIO_VIDEOS.length);

  return (
    <div className="bg-[#F8F3E8] min-h-screen">
      {/* Header */}
      <div className="border-b border-[#D4CDB5]/60">
        <div className="max-w-6xl mx-auto px-4 md:px-8 pt-5 pb-5">
          <h1
            className="text-[#1E2A35] leading-none"
            style={{
              fontFamily: "'Bebas Neue', sans-serif",
              fontSize: 'clamp(1.8rem, 4vw, 2.8rem)',
              letterSpacing: '0.05em',
            }}
          >
            Our Studio
          </h1>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-3 md:px-8 py-4 md:py-8">
            <div className="mb-6 md:mb-8 flex flex-col gap-4">
              <p className="text-[#8A7E6E] text-sm md:text-base leading-relaxed text-justify">
                BALANSÉ is a wellness hub devoted to helping people maintain balance through movement,
                mindfulness, and whole-body well-being. We believe that true wellness is holistic — not
                a single workout or a passing trend, but a way of living that honors both body and mind.
                Every detail of our studio is designed to help you arrive, breathe deeply, and leave feeling
                restored.
              </p>
              <p className="text-[#8A7E6E] text-sm md:text-base leading-relaxed text-justify">
                From yoga and mat pilates to calisthenics, kickboxing, and mindful floor work, our
                disciplines are curated to meet you wherever you are in your journey. Expert coaches guide
                each session with care and intention, creating a space where beginners feel welcome and
                seasoned movers feel challenged. Here, movement is never about perfection — it is about
                presence, progress, and finding your own rhythm.
              </p>
              <p className="text-[#8A7E6E] text-sm md:text-base leading-relaxed text-justify">
                Whether you are stepping through our doors for the very first time or returning to deepen
                your practice, you will find a community that moves together and supports one another
                along the way. Explore the studio below — from sessions in motion to the everyday moments
                that define life at BALANSÉ — and discover what balance means for you.
              </p>
            </div>

            {/* ── Video Carousel ── */}
            <div className="mb-6 md:mb-10">
              <div className="flex items-center justify-between mb-3">
                <h2
                  className="text-[#1E2A35]"
                  style={{
                    fontFamily: "'Bebas Neue', sans-serif",
                    fontSize: 'clamp(1.1rem, 2.5vw, 1.5rem)',
                    letterSpacing: '0.06em',
                  }}
                >
                  Studio in Motion
                </h2>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={prevVideo}
                    className="w-8 h-8 rounded-full bg-[#EDE8D8] border border-[#D4CDB5]/60 flex items-center justify-center text-[#1E2A35] hover:bg-[#E3DCC8] active:scale-95 transition-all"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <button
                    onClick={nextVideo}
                    className="w-8 h-8 rounded-full bg-[#EDE8D8] border border-[#D4CDB5]/60 flex items-center justify-center text-[#1E2A35] hover:bg-[#E3DCC8] active:scale-95 transition-all"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>

              {/* Mobile: single card */}
              <div className="md:hidden relative overflow-hidden rounded-2xl">
                {STUDIO_VIDEOS.map((video, i) => (
                  <div
                    key={video.id}
                    className="transition-all duration-500"
                    style={{ display: i === videoIndex ? 'block' : 'none' }}
                  >
                    <div className="relative rounded-2xl overflow-hidden shadow-md group cursor-pointer"
                      onClick={() => setPlayingVideo(playingVideo === video.id ? null : video.id)}
                    >
                      <img
                        src={video.thumbnail}
                        alt={video.title}
                        className="w-full h-52 object-cover"
                      />
                      <div className="absolute inset-0 bg-[#1E2A35]/40" />
                      {/* Play button */}
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-14 h-14 rounded-full bg-white/20 backdrop-blur-sm border-2 border-white/60 flex items-center justify-center group-active:scale-95 transition-transform">
                          <Play size={22} className="text-white fill-white ml-1" />
                        </div>
                      </div>
                      {/* Duration badge */}
                      <div className="absolute bottom-3 right-3 bg-[#1E2A35]/80 text-white text-xs px-2 py-0.5 rounded-md backdrop-blur-sm">
                        {video.duration}
                      </div>
                      {/* Title */}
                      <div className="absolute bottom-3 left-3 right-16">
                        <p className="text-white text-sm leading-snug drop-shadow">{video.title}</p>
                      </div>
                    </div>
                  </div>
                ))}
                {/* Dots */}
                <div className="flex justify-center gap-2 mt-3">
                  {STUDIO_VIDEOS.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setVideoIndex(i)}
                      className={`rounded-full transition-all duration-200 ${
                        i === videoIndex
                          ? 'w-5 h-2 bg-[#745b3c]'
                          : 'w-2 h-2 bg-[#D4CDB5] hover:bg-[#745b3c]/50'
                      }`}
                    />
                  ))}
                </div>
              </div>

              {/* Desktop: multi-card visible with active highlighted */}
              <div className="hidden md:block relative">
                <div className="flex gap-4 overflow-hidden">
                  {STUDIO_VIDEOS.map((video, i) => {
                    const isActive = i === videoIndex;
                    return (
                      <div
                        key={video.id}
                        onClick={() => setVideoIndex(i)}
                        className={`relative rounded-2xl overflow-hidden shadow-sm cursor-pointer group transition-all duration-400 flex-shrink-0 ${
                          isActive ? 'flex-[2.2]' : 'flex-1 opacity-70 hover:opacity-90'
                        }`}
                      >
                        <img
                          src={video.thumbnail}
                          alt={video.title}
                          className={`w-full object-cover transition-all duration-400 ${isActive ? 'h-64' : 'h-48'}`}
                        />
                        <div className={`absolute inset-0 transition-colors ${isActive ? 'bg-[#1E2A35]/40' : 'bg-[#1E2A35]/30'}`} />
                        {/* Play button */}
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className={`rounded-full bg-white/20 backdrop-blur-sm border-2 border-white/60 flex items-center justify-center ${ICON_HOVER_GROW} ${isActive ? 'w-14 h-14' : 'w-10 h-10'}`}>
                            <Play size={isActive ? 22 : 16} className="text-white fill-white ml-0.5" />
                          </div>
                        </div>
                        {/* Duration badge */}
                        <div className="absolute top-3 right-3 bg-[#1E2A35]/80 text-white text-xs px-2 py-0.5 rounded-md backdrop-blur-sm">
                          {video.duration}
                        </div>
                        {/* Title (only on active) */}
                        {isActive && (
                          <div className="absolute bottom-4 left-4 right-4">
                            <p className="text-white text-sm leading-snug drop-shadow">{video.title}</p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
                {/* Dots */}
                <div className="flex justify-center gap-2 mt-3">
                  {STUDIO_VIDEOS.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setVideoIndex(i)}
                      className={`rounded-full transition-all duration-200 ${
                        i === videoIndex
                          ? 'w-6 h-2 bg-[#745b3c]'
                          : 'w-2 h-2 bg-[#D4CDB5] hover:bg-[#745b3c]/50'
                      }`}
                    />
                  ))}
                </div>
              </div>
            </div>

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
                className="flex items-center gap-2 px-7 py-3 rounded-full border-2 border-[#745b3c] text-[#745b3c] hover:bg-[#745b3c] hover:text-white active:scale-95 transition-all"
                style={{
                  fontFamily: "'Bebas Neue', sans-serif",
                  fontSize: '1rem',
                  letterSpacing: '0.1em',
                }}
              >
                {showMore ? 'See Less' : `See More  (+${GALLERY_IMAGES_MORE.length})`}
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