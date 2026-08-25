import { useState, useMemo } from 'react';
import { Users, Award, Clock, X, ChevronRight, Globe } from 'lucide-react';
import { useStaffAuth } from '../context/StaffAuthContext';
import { CARD_HOVER_GROW } from '../../lib/motion-classes';

// ── Coach Data ──

interface Coach {
  id: string;
  name: string;
  role: string;
  specialties: string[];
  bio: string;
  experience: string;
  nationality: string;
  certifications: string[];
  classes: string[];
  schedule: string;
  color: string;
  initials: string;
  photo: string;
  totalClasses: number;
}

const COACHES: Coach[] = [
  {
    id: 'rex',
    name: 'Rex',
    role: 'Head Coach',
    specialties: ['Calisthenics', 'Capoeira', 'Strength & Conditioning'],
    bio: 'Rex has over 10 years of experience in calisthenics and body weight training. His dynamic coaching style blends functional movement with martial arts-inspired sequences, making every session both challenging and exhilarating.',
    experience: '10+ years',
    nationality: 'Filipino',
    certifications: ['NSCA-CPT', 'Calisthenics Instructor Level 3', 'First Aid & CPR'],
    classes: ['Calisthenics', 'Capoeira'],
    schedule: 'Mon, Wed, Fri · 7:00 AM – 12:00 PM',
    color: '#3A4A5A',
    initials: 'RX',
    photo: 'https://images.unsplash.com/photo-1652400744403-8f29705bd6a5?crop=entropy&cs=tinysrgb&fit=crop&fm=jpg&w=400&h=400&q=80',
    totalClasses: 312,
  },
  {
    id: 'jodi',
    name: 'Jodi',
    role: 'Yoga Specialist',
    specialties: ['Hatha Yoga', 'Vinyasa Flow', 'Restorative Yoga', 'Breath Work'],
    bio: 'Jodi is a 500-hour certified yoga instructor who recently completed an immersive retreat in Ubud, Bali. Her classes are known for their serene atmosphere, precise alignment cues, and deeply healing breath work.',
    experience: '7 years',
    nationality: 'Filipino',
    certifications: ['RYT-500 (Yoga Alliance)', 'Yin Yoga Certified', 'Meditation & Mindfulness'],
    classes: ['Yoga'],
    schedule: 'Mon, Tue, Thu · 8:00 AM – 11:00 AM',
    color: '#745b3c',
    initials: 'JD',
    photo: 'https://images.unsplash.com/photo-1581423880338-b9e4f9718df6?crop=entropy&cs=tinysrgb&fit=crop&fm=jpg&w=400&h=400&q=80',
    totalClasses: 280,
  },
  {
    id: 'ephraim',
    name: 'Ephraim',
    role: 'Movement Coach',
    specialties: ['Animal Flow', 'Groundwork', 'Mobility & Flexibility'],
    bio: 'Ephraim specializes in ground-based movement and Animal Flow, a discipline that blends primal movement patterns with modern mobility science. His classes are energetic, creative, and deeply rewarding for all levels.',
    experience: '6 years',
    nationality: 'Filipino',
    certifications: ['Animal Flow Instructor L2', 'FRC Mobility Specialist', 'NASM-CPT'],
    classes: ['Animal Flow', 'Groundworks'],
    schedule: 'Tue, Thu, Sat · 9:00 AM – 12:00 PM',
    color: '#6B8E6B',
    initials: 'EP',
    photo: 'https://images.unsplash.com/photo-1750698545009-679820502908?crop=entropy&cs=tinysrgb&fit=crop&fm=jpg&w=400&h=400&q=80',
    totalClasses: 198,
  },
  {
    id: 'alec',
    name: 'Alec',
    role: 'Strength Coach',
    specialties: ['Groundworks', 'Functional Strength', 'Movement Preparation'],
    bio: 'Alec brings a background in competitive gymnastics and functional fitness. His Groundworks classes focus on building a strong, mobile foundation that translates into real-world movement capability.',
    experience: '5 years',
    nationality: 'Filipino',
    certifications: ['CSCS (NSCA)', 'Gymnastics Coach Level 2', 'Movement Optimization'],
    classes: ['Groundworks'],
    schedule: 'Mon, Wed, Fri · 11:00 AM – 2:00 PM',
    color: '#8B6F5A',
    initials: 'AL',
    photo: 'https://images.unsplash.com/photo-1598518619776-eae3f8a34eac?crop=entropy&cs=tinysrgb&fit=crop&fm=jpg&w=400&h=400&q=80',
    totalClasses: 165,
  },
  {
    id: 'rachelle',
    name: 'Rachelle',
    role: 'Circuit & Conditioning Coach',
    specialties: ['Circuit Training', 'HIIT', 'Cardio Endurance'],
    bio: 'Rachelle is a high-energy circuit training coach whose sessions are famous for their precision programming and motivating atmosphere. She holds multiple fitness certifications and has coached competitive athletes.',
    experience: '8 years',
    nationality: 'Filipino',
    certifications: ['ACE-CPT', 'TRX Suspension Trainer', 'Les Mills BodyCombat Instructor'],
    classes: ['Circuit Training'],
    schedule: 'Tue, Thu · 12:00 PM – 3:00 PM · Sat 9:00 AM',
    color: '#B86A4A',
    initials: 'RC',
    photo: 'https://images.unsplash.com/photo-1683848644087-c3cb69b77d4f?crop=entropy&cs=tinysrgb&fit=crop&fm=jpg&w=400&h=400&q=80',
    totalClasses: 245,
  },
  {
    id: 'kate',
    name: 'Kate',
    role: 'Pilates Specialist',
    specialties: ['Mat Pilates', 'Core Stability', 'Posture Correction'],
    bio: 'Kate is a certified Pilates instructor with a passion for helping clients build deep core strength and improve posture. Her thoughtful cueing and attention to form make her classes accessible and highly effective.',
    experience: '9 years',
    nationality: 'Filipino',
    certifications: ['Pilates Method Alliance Certified', 'Polestar Pilates Instructor', 'Pre/Postnatal Pilates'],
    classes: ['Mat Pilates'],
    schedule: 'Mon, Wed, Thu · 9:00 AM – 12:00 PM',
    color: '#9A7A8A',
    initials: 'KT',
    photo: 'https://images.unsplash.com/photo-1645081522795-231884bfcbfc?crop=entropy&cs=tinysrgb&fit=crop&fm=jpg&w=400&h=400&q=80',
    totalClasses: 290,
  },
  {
    id: 'wolf',
    name: 'Wolf',
    role: 'Combat Arts Coach',
    specialties: ['Kickboxing', 'Muay Thai Conditioning', 'Self-Defense'],
    bio: 'Wolf brings a fierce competitive background to the studio floor. With 12+ years in martial arts and combat fitness, his kickboxing classes deliver a full-body workout wrapped in the discipline and technique of combat sports.',
    experience: '12+ years',
    nationality: 'Filipino',
    certifications: ['Muay Thai Instructor (WKA)', 'NASM-CPT', 'Combat Conditioning Specialist'],
    classes: ['Kickboxing'],
    schedule: 'Wed, Fri · 5:00 PM – 8:00 PM · Sat 10:00 AM',
    color: '#7A3A4A',
    initials: 'WF',
    photo: 'https://images.unsplash.com/photo-1645458314292-af7e370a9b52?crop=entropy&cs=tinysrgb&fit=crop&fm=jpg&w=400&h=400&q=80',
    totalClasses: 320,
  },
];

function CoachCard({ coach, onClick }: { coach: Coach; onClick: () => void }) {
  const [imgErr, setImgErr] = useState(false);
  return (
    <button
      onClick={onClick}
      className={`bg-white rounded-3xl border border-[#D4CDB5]/60 shadow-sm overflow-hidden text-left hover:shadow-md hover:border-[#745b3c]/30 active:scale-[0.97] group ${CARD_HOVER_GROW}`}
    >
      <div className="relative h-36 overflow-hidden" style={{ backgroundColor: `${coach.color}15` }}>
        {!imgErr ? (
          <img
            src={coach.photo}
            alt={`Coach ${coach.name}`}
            className="w-full h-full object-cover object-top"
            onError={() => setImgErr(true)}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '3rem', letterSpacing: '0.1em', color: coach.color, opacity: 0.4 }}>{coach.initials}</span>
          </div>
        )}
        <div className="absolute bottom-0 left-0 right-0 h-10" style={{ background: 'linear-gradient(to top, white, transparent)' }} />
        <div className="absolute top-3 right-3">
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: coach.color }} />
        </div>
      </div>
      <div className="p-5 pt-3">
        <h3 className="text-[#1E2A35] leading-none mb-0.5" style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.5rem', letterSpacing: '0.04em' }}>{coach.name}</h3>
        <p className="text-[#8A7E6E] text-xs font-semibold mb-3">{coach.role}</p>
        <div className="flex flex-wrap gap-1.5 mb-4">
          {coach.classes.map(cls => (
            <span key={cls} className="px-2 py-0.5 rounded-full text-[10px] font-bold text-white" style={{ backgroundColor: coach.color }}>{cls}</span>
          ))}
        </div>
        <div className="flex items-center gap-1 text-[#745b3c] text-xs font-semibold group-hover:gap-2 transition-all">
          View Profile <ChevronRight size={12} className="group-hover:translate-x-0.5 transition-transform" />
        </div>
      </div>
    </button>
  );
}

function CoachPhotoModal({ coach, onClose }: { coach: Coach; onClose: () => void }) {
  const [imgError, setImgError] = useState(false);
  const largePhoto = coach.photo.replace(/w=\d+/, 'w=800').replace(/h=\d+/, 'h=800');

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(30,42,53,0.75)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={`Photo of Coach ${coach.name}`}
    >
      <div className="relative w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close photo"
          className="absolute -top-3 -right-3 z-10 flex h-9 w-9 items-center justify-center rounded-xl bg-white text-[#8A7E6E] shadow-md transition-all hover:bg-[#F8F3E8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#745b3c]/50"
        >
          <X size={16} />
        </button>
        <div className="overflow-hidden rounded-2xl border-4 border-white bg-white shadow-2xl">
          {!imgError ? (
            <img
              src={largePhoto}
              alt={`Coach ${coach.name}`}
              className="aspect-square w-full object-cover"
              onError={() => setImgError(true)}
            />
          ) : (
            <div
              className="flex aspect-square w-full items-center justify-center"
              style={{ backgroundColor: `${coach.color}18` }}
            >
              <span
                style={{
                  fontFamily: "'Bebas Neue', sans-serif",
                  fontSize: '4rem',
                  letterSpacing: '0.08em',
                  color: coach.color,
                }}
              >
                {coach.initials}
              </span>
            </div>
          )}
        </div>
        <p className="mt-3 text-center text-sm font-semibold text-white/80">{coach.name}</p>
      </div>
    </div>
  );
}

function CoachModal({ coach, onClose }: { coach: Coach; onClose: () => void }) {
  const [imgError, setImgError] = useState(false);
  const [photoOpen, setPhotoOpen] = useState(false);

  return (
    <>
      {photoOpen && <CoachPhotoModal coach={coach} onClose={() => setPhotoOpen(false)} />}

      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto" style={{ backgroundColor: 'rgba(30,42,53,0.55)', backdropFilter: 'blur(4px)' }}>
        <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl my-4 overflow-hidden">
          {/* Cover banner with overlapping profile photo */}
          <div className="relative">
            <div className="relative h-36 md:h-40 overflow-hidden" style={{ backgroundColor: `${coach.color}20` }}>
              <div className="absolute inset-0" style={{ background: `linear-gradient(135deg, ${coach.color}35 0%, ${coach.color}08 100%)` }} />
              <button
                type="button"
                onClick={onClose}
                aria-label="Close profile"
                className="absolute top-4 right-4 flex h-9 w-9 items-center justify-center rounded-xl bg-white/80 text-[#8A7E6E] shadow-sm backdrop-blur-sm transition-all hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#745b3c]/50"
              >
                <X size={16} />
              </button>
              <div className="absolute bottom-0 left-0 right-0 h-[3px]" style={{ backgroundColor: coach.color }} />
            </div>

            <button
              type="button"
              onClick={() => setPhotoOpen(true)}
              aria-label={`View full photo of Coach ${coach.name}`}
              className="absolute bottom-0 left-6 md:left-8 z-10 h-24 w-24 md:h-28 md:w-28 translate-y-1/2 overflow-hidden rounded-2xl border-4 border-white shadow-lg transition-all hover:brightness-95 hover:ring-2 hover:ring-[#745b3c]/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#745b3c] active:scale-[0.98] cursor-pointer"
            >
              {!imgError ? (
                <img
                  src={coach.photo}
                  alt={`Coach ${coach.name}`}
                  className="h-full w-full object-cover"
                  onError={() => setImgError(true)}
                />
              ) : (
                <div
                  className="flex h-full w-full items-center justify-center"
                  style={{ backgroundColor: `${coach.color}18` }}
                >
                  <span
                    style={{
                      fontFamily: "'Bebas Neue', sans-serif",
                      fontSize: '2rem',
                      letterSpacing: '0.08em',
                      color: coach.color,
                    }}
                  >
                    {coach.initials}
                  </span>
                </div>
              )}
            </button>
          </div>

          {/* Identity section */}
          <div className="border-b border-[#D4CDB5]/50 px-6 pb-5 pt-14 md:px-8 md:pt-16">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="text-[#1E2A35] leading-none" style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '2.2rem', letterSpacing: '0.04em' }}>{coach.name}</h2>
                <p className="mt-0.5 text-sm font-semibold text-[#8A7E6E]">{coach.role}</p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <span className="rounded-full px-2.5 py-1 text-xs font-medium" style={{ backgroundColor: `${coach.color}18`, color: coach.color }}>{coach.experience} experience</span>
                  {coach.nationality.trim() && (
                    <span className="inline-flex items-center gap-1 rounded-full border border-[#D4CDB5]/60 bg-[#F8F3E8] px-2.5 py-1 text-xs font-medium text-[#5A5048]">
                      <Globe size={11} className="text-[#745b3c]" />
                      {coach.nationality}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex shrink-0 flex-wrap justify-start gap-2 sm:justify-end">
                {coach.classes.map(cls => (
                  <span key={cls} className="rounded-full px-3 py-1 text-xs font-bold text-white" style={{ backgroundColor: coach.color }}>{cls}</span>
                ))}
              </div>
            </div>
          </div>

        <div className="px-8 py-6 grid md:grid-cols-2 gap-6 max-h-[50vh] overflow-y-auto pb-8">
          {/* Left column */}
          <div className="flex flex-col gap-5">
            <div>
              <p className="text-[#8A7E6E] text-xs uppercase tracking-widest mb-2">About</p>
              <p className="text-[#5A5048] text-sm leading-relaxed">{coach.bio}</p>
            </div>

            {coach.nationality.trim() && (
              <div>
                <p className="text-[#8A7E6E] text-xs uppercase tracking-widest mb-2 flex items-center gap-1">
                  <Globe size={11} /> Nationality
                </p>
                <p className="text-[#5A5048] text-sm">{coach.nationality}</p>
              </div>
            )}

            {/* Schedule */}
            <div>
              <p className="text-[#8A7E6E] text-xs uppercase tracking-widest mb-2 flex items-center gap-1">
                <Clock size={11} /> Typical Schedule
              </p>
              <p className="text-[#5A5048] text-sm">{coach.schedule}</p>
            </div>
          </div>

          {/* Right column */}
          <div className="flex flex-col gap-5">
            {/* Specialties */}
            <div>
              <p className="text-[#8A7E6E] text-xs uppercase tracking-widest mb-2">Specialties</p>
              <div className="flex flex-wrap gap-2">
                {coach.specialties.map(s => (
                  <span key={s} className="px-3 py-1 rounded-full text-xs font-medium border border-[#D4CDB5]/60 bg-[#F8F3E8] text-[#5A5048]">{s}</span>
                ))}
              </div>
            </div>

            {/* Certifications */}
            <div>
              <p className="text-[#8A7E6E] text-xs uppercase tracking-widest mb-2 flex items-center gap-1">
                <Award size={11} /> Certifications
              </p>
              <div className="flex flex-col gap-1.5">
                {coach.certifications.map(c => (
                  <div key={c} className="flex items-center gap-2 text-xs text-[#5A5048]">
                    <div className="w-1 h-1 rounded-full bg-[#745b3c] shrink-0" />
                    {c}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    </>
  );
}

export default function CoachesPage() {
  const { staffUser, staffProfile } = useStaffAuth();
  const [selectedCoach, setSelectedCoach] = useState<Coach | null>(null);

  // Merge any logged-in coach's updated profile into the static COACHES list
  const coaches = useMemo(() => {
    if (!staffUser || !staffProfile) return COACHES;
    const staffFirstName = staffUser.name.split(' ')[0].toLowerCase();
    return COACHES.map(c =>
      c.name.toLowerCase() === staffFirstName
        ? {
            ...c,
            name: staffProfile.displayName || c.name,
            photo: staffProfile.photo || c.photo,
            bio: staffProfile.bio || c.bio,
            experience: staffProfile.experience || c.experience,
            nationality: staffProfile.nationality || c.nationality,
            classes: staffProfile.classes.length > 0 ? staffProfile.classes : c.classes,
          }
        : c
    );
  }, [staffUser, staffProfile]);

  return (
    <div className="bg-[#F8F3E8] min-h-screen">
      {selectedCoach && <CoachModal coach={selectedCoach} onClose={() => setSelectedCoach(null)} />}

      <div className="max-w-6xl mx-auto px-4 md:px-8 py-10">

        {/* Header */}
        <div className="mb-10">
          <div className="flex items-center gap-2 mb-2">
            <Users size={16} className="text-[#745b3c]" />
            <span className="text-[#8A7E6E] text-xs uppercase tracking-widest">Meet the Team</span>
          </div>
          <h1 className="text-[#1E2A35] leading-tight" style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 'clamp(2.5rem, 6vw, 4rem)', letterSpacing: '0.04em' }}>
            Our Coaches
          </h1>
          <p className="text-[#8A7E6E] text-sm mt-1 max-w-xl">
            World-class coaches dedicated to helping you move better, feel stronger, and live well.
            Tap any coach card to view their full profile.
          </p>
        </div>

        {/* Coach grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {coaches.map(coach => (
            <CoachCard key={coach.id} coach={coach} onClick={() => setSelectedCoach(coach)} />
          ))}
        </div>
      </div>
    </div>
  );
}
