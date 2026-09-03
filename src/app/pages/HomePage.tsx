import { useState } from 'react';
import { useNavigate } from 'react-router';
import { ChevronLeft, ChevronRight, Check, Leaf, Users, Clock, Play } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { GymButton } from '../components/ui/GymButton';
import { HelpSupportFab } from '../components/layout/HelpSupportFab';
import { HomeStorySection } from '../components/home/HomeStorySection';
import { HomeCoachesSection } from '../components/home/HomeCoachesSection';
import { ICON_HOVER_GROW } from '../../lib/motion-classes';

const HERO_IMG =
  'https://images.unsplash.com/photo-1761971975973-cbb3e59263de?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080';

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

const perks = [
  'Expert-led sessions in 9 disciplines',
  'Small group classes for personal attention',
  'Serene, thoughtfully designed studio spaces',
  'Flexible scheduling for busy lifestyles',
  'Holistic wellness — body, mind & spirit',
  'Community of 200+ dedicated members',
];

export default function HomePage() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [videoIndex, setVideoIndex] = useState(0);
  const [playingVideo, setPlayingVideo] = useState<number | null>(null);

  const handleBook = () => {
    navigate(isAuthenticated ? '/dashboard' : '/auth');
  };

  const prevVideo = () => setVideoIndex((i) => (i - 1 + STUDIO_VIDEOS.length) % STUDIO_VIDEOS.length);
  const nextVideo = () => setVideoIndex((i) => (i + 1) % STUDIO_VIDEOS.length);

  return (
    <div className="bg-[#F8F3E8]">
      {/* ─── HERO ─── */}
      <section className="relative h-[72vh] md:h-[88vh] overflow-hidden">
        <img
          src={HERO_IMG}
          alt="BALANSÉ wellness studio"
          className="w-full h-full object-cover"
        />

        {/* Subtle global scrim — keeps image visible while lifting overall contrast */}
        <div className="absolute inset-0 bg-black/20" />

        {/* Directional text-area overlay — fades from dark at the text side to transparent */}
        {/* Mobile: bottom-to-top   |   Desktop: left-to-right */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/45 to-black/5 md:bg-gradient-to-r md:from-black/70 md:via-black/40 md:to-transparent" />

        {/* Extra depth anchor at bottom-left corner on desktop for a cinematic vignette */}
        <div className="hidden md:block absolute inset-0" style={{ background: 'radial-gradient(ellipse 60% 80% at 0% 100%, rgba(0,0,0,0.35) 0%, transparent 70%)' }} />

        {/* Stats bar — mobile only */}
        <div className="md:hidden absolute top-4 left-4 right-4 flex gap-2 justify-end">
          {[
            { icon: <Users size={12} />, label: '200+ Members' },
            { icon: <Leaf size={12} />, label: '9 Disciplines' },
          ].map((s) => (
            <div
              key={s.label}
              className="flex items-center gap-1.5 bg-[#F8F3E8]/80 backdrop-blur-md rounded-full px-3 py-1.5"
            >
              <span className="text-[#c49a3c]">{s.icon}</span>
              <span className="text-[#1E2A35] text-xs font-medium">{s.label}</span>
            </div>
          ))}
        </div>

        {/* Hero text */}
        <div className="absolute inset-0 flex items-end md:items-center">
          <div className="w-full md:max-w-6xl md:mx-auto px-5 md:px-8 pb-8 md:pb-0">
            <div className="md:max-w-xl">
              <p className="text-[#c49a3c] font-semibold text-xs uppercase tracking-[0.25em] mb-3">
                Premium Wellness Hub
              </p>
              <h1
                className="text-white leading-none mb-4 md:mb-6"
                style={{
                  fontFamily: "'Bebas Neue', sans-serif",
                  fontSize: 'clamp(3rem, 8vw, 5.5rem)',
                  lineHeight: '1',
                  letterSpacing: '0.04em',
                }}
              >
                Find Your
                <br />
                Balance.
              </h1>
              <p className="hidden md:block text-white/70 text-lg mb-8 max-w-md leading-relaxed">
                Nine movement disciplines. Seven world-class coaches. One studio built around your wellbeing.
              </p>
              {/* Desktop stats pills */}
              <div className="hidden md:flex items-center gap-4 mb-8">
                {[
                  { icon: <Users size={14} />, label: '200+ Members' },
                  { icon: <Leaf size={14} />, label: '9 Disciplines' },
                  { icon: <Clock size={14} />, label: '7 Expert Coaches' },
                ].map((s) => (
                  <div
                    key={s.label}
                    className="flex items-center gap-2 bg-white/15 backdrop-blur-md rounded-full px-4 py-2"
                  >
                    <span className="text-[#c49a3c]">{s.icon}</span>
                    <span className="text-white text-sm font-medium">{s.label}</span>
                  </div>
                ))}
              </div>
              <div className="flex gap-3">
                <GymButton variant="primary" size="lg" onClick={handleBook} className="md:w-auto w-full">
                  Schedule a Class
                </GymButton>
                <button
                  onClick={() => navigate('/classes')}
                  className="hidden md:flex items-center gap-2 px-6 py-4 border-2 border-white/40 text-white rounded-full font-semibold hover:border-white hover:bg-white/10 transition-all"
                >
                  Explore Classes
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── MAIN CONTENT ─── */}
      <div className="max-w-6xl mx-auto">

        <HomeStorySection />

        <HomeCoachesSection />

        {/* ─── STUDIO IN MOTION ─── */}
        <section className="px-4 md:px-8 pt-2 md:pt-4 pb-14 md:pb-20">
          <div className="flex items-center justify-between mb-3 md:mb-4">
            <h2
              className="text-[#1E2A35]"
              style={{
                fontFamily: "'Bebas Neue', sans-serif",
                fontSize: 'clamp(1.1rem, 2.5vw, 1.5rem)',
                letterSpacing: '0.06em',
              }}
            >
              Balance in Motion
            </h2>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={prevVideo}
                className="w-8 h-8 rounded-full bg-[#EDE8D8] border border-[#D4CDB5]/60 flex items-center justify-center text-[#1E2A35] hover:bg-[#E3DCC8] active:scale-95 transition-all"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                type="button"
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
                <div
                  className="relative rounded-2xl overflow-hidden shadow-md group cursor-pointer"
                  onClick={() => setPlayingVideo(playingVideo === video.id ? null : video.id)}
                >
                  <img
                    src={video.thumbnail}
                    alt={video.title}
                    className="w-full h-52 object-cover"
                  />
                  <div className="absolute inset-0 bg-[#1E2A35]/40" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-14 h-14 rounded-full bg-white/20 backdrop-blur-sm border-2 border-white/60 flex items-center justify-center group-active:scale-95 transition-transform">
                      <Play size={22} className="text-white fill-white ml-1" />
                    </div>
                  </div>
                  <div className="absolute bottom-3 right-3 bg-[#1E2A35]/80 text-white text-xs px-2 py-0.5 rounded-md backdrop-blur-sm">
                    {video.duration}
                  </div>
                  <div className="absolute bottom-3 left-3 right-16">
                    <p className="text-white text-sm leading-snug drop-shadow">{video.title}</p>
                  </div>
                </div>
              </div>
            ))}
            <div className="flex justify-center gap-2 mt-3">
              {STUDIO_VIDEOS.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setVideoIndex(i)}
                  className={`rounded-full transition-all duration-200 ${
                    i === videoIndex
                      ? 'w-5 h-2 bg-[#c49a3c]'
                      : 'w-2 h-2 bg-[#D4CDB5] hover:bg-[#c49a3c]/50'
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
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className={`rounded-full bg-white/20 backdrop-blur-sm border-2 border-white/60 flex items-center justify-center ${ICON_HOVER_GROW} ${isActive ? 'w-14 h-14' : 'w-10 h-10'}`}>
                        <Play size={isActive ? 22 : 16} className="text-white fill-white ml-0.5" />
                      </div>
                    </div>
                    <div className="absolute top-3 right-3 bg-[#1E2A35]/80 text-white text-xs px-2 py-0.5 rounded-md backdrop-blur-sm">
                      {video.duration}
                    </div>
                    {isActive && (
                      <div className="absolute bottom-4 left-4 right-4">
                        <p className="text-white text-sm leading-snug drop-shadow">{video.title}</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            <div className="flex justify-center gap-2 mt-3">
              {STUDIO_VIDEOS.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setVideoIndex(i)}
                  className={`rounded-full transition-all duration-200 ${
                    i === videoIndex
                      ? 'w-6 h-2 bg-[#c49a3c]'
                      : 'w-2 h-2 bg-[#D4CDB5] hover:bg-[#c49a3c]/50'
                  }`}
                />
              ))}
            </div>
          </div>
        </section>

        {/* ─── PERKS ─── */}
        <section id="why-balanse" className="mx-4 md:mx-8 mb-14 md:mb-20 rounded-3xl border border-[#c49a3c]/25 px-5 md:px-10 py-8 md:py-14 scroll-mt-24" style={{ backgroundColor: 'rgba(196,154,60,0.07)' }}>
          <h2
            className="text-[#1E2A35] mb-4 md:mb-6 md:text-center"
            style={{
              fontFamily: "'Bebas Neue', sans-serif",
              fontSize: '1.8rem',
              letterSpacing: '0.05em',
            }}
          >
            Why BALANSÉ?
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
            {perks.map((perk) => (
              <div key={perk} className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-full bg-[#c49a3c] flex items-center justify-center shrink-0">
                  <Check size={13} className="text-white" strokeWidth={3} />
                </div>
                <p className="text-[#5A5048] text-sm">{perk}</p>
              </div>
            ))}
          </div>
        </section>

      </div>

      <HelpSupportFab />
    </div>
  );
}