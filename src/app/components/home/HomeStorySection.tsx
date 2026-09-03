import { useEffect, useRef, useState } from 'react';
import { motion, useReducedMotion, useScroll, useTransform } from 'motion/react';
import { ImageWithFallback } from '../figma/ImageWithFallback';

const STORY_CHAPTERS = [
  {
    id: 'arrive',
    number: '01',
    kicker: 'The studio',
    title: 'Arrive. Breathe. Restore.',
    body: 'BALANSÉ is a wellness hub devoted to helping people maintain balance through movement, mindfulness, and whole-body well-being. We believe that true wellness is holistic — not a single workout or a passing trend, but a way of living that honors both body and mind. Every detail of our studio is designed to help you arrive, breathe deeply, and leave feeling restored.',
    image:
      'https://images.unsplash.com/photo-1761971975973-cbb3e59263de?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1400',
    imageAlt: 'Morning light filling the BALANSÉ studio',
    caption: 'Studio 1 · Morning light',
    accent:
      'https://images.unsplash.com/photo-1699378281595-0d75e9e6a05a?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=800',
    accentAlt: 'The reception lounge at BALANSÉ',
  },
  {
    id: 'move',
    number: '02',
    kicker: 'The practice',
    title: 'Presence over perfection.',
    body: 'From yoga and mat pilates to calisthenics, kickboxing, and mindful floor work, our disciplines are curated to meet you wherever you are in your journey. Expert coaches guide each session with care and intention, creating a space where beginners feel welcome and seasoned movers feel challenged. Here, movement is never about perfection — it is about presence, progress, and finding your own rhythm.',
    image:
      'https://images.unsplash.com/photo-1767611120077-3697335ec748?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1400',
    imageAlt: 'A yoga morning session at BALANSÉ',
    caption: 'Yoga · Flow & breathe',
    accent:
      'https://images.unsplash.com/photo-1637157216470-d92cd2edb2e8?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=800',
    accentAlt: 'Mat pilates core work',
  },
  {
    id: 'belong',
    number: '03',
    kicker: 'The community',
    title: 'Move together.',
    body: 'Whether you are stepping through our doors for the very first time or returning to deepen your practice, you will find a community that moves together and supports one another along the way. Explore the studio below — from sessions in motion to the everyday moments that define life at BALANSÉ — and discover what balance means for you.',
    image:
      'https://images.unsplash.com/photo-1717500252780-036bfd89f810?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1400',
    imageAlt: 'A community movement session at BALANSÉ',
    caption: 'Community · Animal Flow',
    accent:
      'https://images.unsplash.com/photo-1759352856072-985a4ddab82d?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=800',
    accentAlt: 'Capoeira in motion at the studio',
  },
] as const;

const EASE = [0.22, 1, 0.36, 1] as const;

function ChapterCopy({
  chapter,
  active,
}: {
  chapter: (typeof STORY_CHAPTERS)[number];
  active: boolean;
}) {
  return (
    <>
      <p className={`text-xs uppercase tracking-[0.22em] mb-3 transition-colors duration-500 ${active ? 'text-[#c49a3c]' : 'text-[#9A8E7E]'}`}>
        {chapter.number} — {chapter.kicker}
      </p>
      <h3
        className="text-[#1E2A35] leading-none mb-4"
        style={{
          fontFamily: "'Bebas Neue', sans-serif",
          fontSize: 'clamp(1.85rem, 4vw, 2.6rem)',
          letterSpacing: '0.04em',
        }}
      >
        {chapter.title}
      </h3>
      <p className="text-[#8A7E6E] text-sm md:text-base leading-relaxed">
        {chapter.body}
      </p>
    </>
  );
}

function StoryStage({
  active,
  reduceMotion,
  className,
}: {
  active: number;
  reduceMotion: boolean | null;
  className?: string;
}) {
  const chapter = STORY_CHAPTERS[active];

  return (
    <div className={`relative ${className ?? ''}`}>
      <div className="relative h-full overflow-hidden rounded-[1.75rem] bg-[#1E2A35] shadow-lg">
        {STORY_CHAPTERS.map((item, i) => {
          const isActive = i === active;
          return (
            <motion.div
              key={item.id}
              className="absolute inset-0"
              initial={false}
              animate={{ opacity: isActive ? 1 : 0 }}
              transition={{ duration: reduceMotion ? 0.15 : 0.7, ease: EASE }}
              aria-hidden={!isActive}
            >
              <motion.div
                className="absolute inset-0"
                initial={false}
                animate={reduceMotion ? { scale: 1 } : { scale: isActive ? 1.08 : 1 }}
                transition={{ duration: reduceMotion ? 0 : 12, ease: 'linear' }}
              >
                <ImageWithFallback
                  src={item.image}
                  alt={isActive ? item.imageAlt : ''}
                  className="w-full h-full object-cover"
                  loading={i === 0 ? 'eager' : 'lazy'}
                  decoding="async"
                />
              </motion.div>
            </motion.div>
          );
        })}

        <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/10 to-transparent pointer-events-none" />

        <motion.div
          key={chapter.id}
          className="absolute bottom-4 left-4 right-28 flex items-end justify-between gap-3"
          initial={reduceMotion ? false : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: EASE }}
        >
          <p className="text-white/90 text-xs tracking-wide drop-shadow">{chapter.caption}</p>
          <span className="text-white/70 text-[11px] uppercase tracking-[0.18em]">{chapter.number} / 03</span>
        </motion.div>
      </div>

      <motion.div
        key={`${chapter.id}-accent`}
        className="hidden lg:block absolute right-[-1.1rem] bottom-12 w-[42%] max-w-[210px] z-10"
        initial={reduceMotion ? false : { opacity: 0, y: 28, rotate: 8 }}
        animate={{ opacity: 1, y: 0, rotate: 3 }}
        transition={{ duration: 0.55, ease: EASE }}
      >
        <div className="aspect-[4/5] overflow-hidden rounded-2xl border-[5px] border-[#F8F3E8] bg-[#EDE8D8] shadow-2xl">
          <ImageWithFallback
            src={chapter.accent}
            alt={chapter.accentAlt}
            className="w-full h-full object-cover"
            loading="lazy"
            decoding="async"
          />
        </div>
      </motion.div>
    </div>
  );
}

function layoutForViewport() {
  return window.matchMedia('(min-width: 768px)').matches ? 'desktop' : 'mobile';
}

export function HomeStorySection() {
  const reduceMotion = useReducedMotion();
  const trackRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);

  const { scrollYProgress } = useScroll({
    target: trackRef,
    offset: ['start 0.7', 'end 0.35'],
  });
  const progressWidth = useTransform(scrollYProgress, [0, 1], ['0%', '100%']);

  useEffect(() => {
    const nodes = Array.from(
      document.querySelectorAll<HTMLElement>('[data-story-chapter]'),
    );
    if (!nodes.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (!visible) return;
        const index = Number((visible.target as HTMLElement).dataset.storyChapter);
        if (!Number.isNaN(index)) setActive(index);
      },
      { threshold: [0.25, 0.45, 0.7], rootMargin: '-18% 0px -32% 0px' },
    );

    nodes.forEach((node) => observer.observe(node));
    return () => observer.disconnect();
  }, []);

  const goToChapter = (index: number) => {
    const layout = layoutForViewport();
    document
      .querySelector<HTMLElement>(`[data-story-chapter="${index}"][data-story-layout="${layout}"]`)
      ?.scrollIntoView({
        behavior: reduceMotion ? 'auto' : 'smooth',
        block: 'center',
      });
  };

  return (
    <section id="our-story" className="px-4 md:px-8 pt-14 md:pt-20 pb-6 md:pb-8">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-6 md:mb-10">
        <div>
          <p className="text-[#c49a3c] text-xs uppercase tracking-[0.22em] font-semibold mb-2">
            Our story
          </p>
          <h2
            className="text-[#1E2A35] leading-none"
            style={{
              fontFamily: "'Bebas Neue', sans-serif",
              fontSize: 'clamp(1.8rem, 4vw, 2.4rem)',
              letterSpacing: '0.05em',
            }}
          >
            A way of living
          </h2>
        </div>

        <div className="flex flex-wrap items-center gap-1" role="tablist" aria-label="Story chapters">
          {STORY_CHAPTERS.map((chapter, i) => {
            const isActive = i === active;
            return (
              <button
                key={chapter.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => goToChapter(i)}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold tracking-wide transition-all duration-300 ${
                  isActive
                    ? 'bg-[#c49a3c] text-white'
                    : 'text-[#8A7E6E] hover:bg-[#EDE8D8] hover:text-[#1E2A35]'
                }`}
              >
                {chapter.number} {chapter.kicker.replace('The ', '')}
              </button>
            );
          })}
        </div>
      </div>

      <div ref={trackRef} className="relative">
        <div className="hidden md:block h-px bg-[#D4CDB5]/70 mb-8 overflow-hidden">
          <motion.div
            className="h-full bg-[#c49a3c] origin-left"
            style={{ width: progressWidth }}
          />
        </div>

        <div className="hidden md:grid md:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] gap-10 lg:gap-14 items-start">
          <div className="sticky top-[4.75rem] h-[calc(100dvh-6.25rem)]">
            <StoryStage active={active} reduceMotion={reduceMotion} className="h-full" />
          </div>

          <div className="flex flex-col">
            {STORY_CHAPTERS.map((chapter, i) => (
              <article
                key={chapter.id}
                id={`story-${chapter.id}`}
                data-story-chapter={i}
                data-story-layout="desktop"
                className="min-h-[82vh] flex items-center py-10 scroll-mt-28"
              >
                <motion.div
                  initial={false}
                  animate={{
                    opacity: active === i ? 1 : 0.38,
                    y: reduceMotion ? 0 : active === i ? 0 : 12,
                  }}
                  transition={{ duration: 0.45, ease: EASE }}
                  className="max-w-md"
                >
                  <ChapterCopy chapter={chapter} active={active === i} />
                </motion.div>
              </article>
            ))}
          </div>
        </div>

        <div className="md:hidden flex flex-col gap-4">
          {STORY_CHAPTERS.map((chapter, i) => (
            <article
              key={chapter.id}
              id={`story-${chapter.id}-m`}
              data-story-chapter={i}
              data-story-layout="mobile"
              className="relative"
            >
              <div className="h-[72vh]">
                <div className="sticky top-[4.5rem] z-0 h-[52vh] overflow-hidden rounded-[1.75rem] shadow-md">
                  <motion.div
                    className="absolute inset-0"
                    initial={false}
                    animate={reduceMotion ? { scale: 1 } : { scale: active === i ? 1.06 : 1 }}
                    transition={{ duration: reduceMotion ? 0 : 10, ease: 'linear' }}
                  >
                    <ImageWithFallback
                      src={chapter.image}
                      alt={chapter.imageAlt}
                      className="w-full h-full object-cover"
                      loading={i === 0 ? 'eager' : 'lazy'}
                      decoding="async"
                    />
                  </motion.div>
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-black/10" />
                  <p className="absolute bottom-3 left-4 text-white/90 text-xs drop-shadow">
                    {chapter.caption}
                  </p>
                </div>
              </div>

              <div className="relative z-10 -mt-16 mx-1 mb-6 rounded-3xl border border-[#D4CDB5]/60 bg-[#F8F3E8] px-5 py-6 shadow-sm">
                <ChapterCopy chapter={chapter} active />
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
