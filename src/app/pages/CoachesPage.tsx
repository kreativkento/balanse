import { useState, useMemo } from 'react';
import { Users, Award, Clock, X, ChevronRight } from 'lucide-react';
import { useStaffAuth } from '../context/StaffAuthContext';

// ── Coach Data ──

interface Coach {
  id: string;
  name: string;
  role: string;
  specialties: string[];
  bio: string;
  experience: string;
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
    certifications: ['RYT-500 (Yoga Alliance)', 'Yin Yoga Certified', 'Meditation & Mindfulness'],
    classes: ['Yoga'],
    schedule: 'Mon, Tue, Thu · 8:00 AM – 11:00 AM',
    color: '#C49A3C',
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
      className="bg-white rounded-3xl border border-[#D4CDB5]/60 shadow-sm overflow-hidden text-left hover:shadow-md hover:border-[#C49A3C]/30 active:scale-[0.97] transition-all group"
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
        <div className="flex items-center gap-1 text-[#C49A3C] text-xs font-semibold group-hover:gap-2 transition-all">
          View Profile <ChevronRight size={12} className="group-hover:translate-x-0.5 transition-transform" />
        </div>
      </div>
    </button>
  );
}

function CoachModal({ coach, onClose }: { coach: Coach; onClose: () => void }) {
  const [imgError, setImgError] = useState(false);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto" style={{ backgroundColor: 'rgba(30,42,53,0.55)', backdropFilter: 'blur(4px)' }}>
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl my-4 overflow-hidden">
        {/* Hero banner — background only, no avatar */}
        <div className="relative h-32 overflow-hidden" style={{ backgroundColor: `${coach.color}20` }}>
          <div className="absolute inset-0" style={{ background: `linear-gradient(135deg, ${coach.color}35 0%, ${coach.color}08 100%)` }} />
          <div className="absolute top-4 right-4">
            <button
              onClick={onClose}
              className="w-9 h-9 rounded-xl bg-white/80 backdrop-blur-sm text-[#8A7E6E] hover:bg-white flex items-center justify-center transition-all shadow-sm"
            >
              <X size={16} />
            </button>
          </div>
          {/* Accent bar */}
          <div className="absolute bottom-0 left-0 right-0 h-[3px]" style={{ backgroundColor: coach.color }} />
        </div>

        {/* Identity section — avatar fully inside, no overlap */}
        <div className="px-8 pt-6 pb-5 border-b border-[#D4CDB5]/50">
          <div className="flex items-start gap-5">
            {/* Avatar — contained entirely in this section */}
            <div className="w-24 h-24 rounded-2xl overflow-hidden border-2 shadow-md shrink-0" style={{ borderColor: `${coach.color}40` }}>
              {!imgError ? (
                <img
                  src={coach.photo}
                  alt={`Coach ${coach.name}`}
                  className="w-full h-full object-cover"
                  onError={() => setImgError(true)}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center" style={{ backgroundColor: `${coach.color}18` }}>
                  <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '2rem', letterSpacing: '0.08em', color: coach.color }}>{coach.initials}</span>
                </div>
              )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0 pt-1">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div>
                  <h2 className="text-[#1E2A35] leading-none" style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '2.2rem', letterSpacing: '0.04em' }}>{coach.name}</h2>
                  <p className="text-[#8A7E6E] text-sm font-semibold mt-0.5">{coach.role}</p>
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    <span className="text-xs px-2.5 py-1 rounded-full font-medium" style={{ backgroundColor: `${coach.color}18`, color: coach.color }}>{coach.experience} experience</span>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 justify-end shrink-0">
                  {coach.classes.map(cls => (
                    <span key={cls} className="px-3 py-1 rounded-full text-xs font-bold text-white" style={{ backgroundColor: coach.color }}>{cls}</span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="px-8 py-6 grid md:grid-cols-2 gap-6 max-h-[50vh] overflow-y-auto">
          {/* Left column */}
          <div className="flex flex-col gap-5">
            {/* Bio */}
            <div>
              <p className="text-[#8A7E6E] text-xs uppercase tracking-widest mb-2">About</p>
              <p className="text-[#5A5048] text-sm leading-relaxed">{coach.bio}</p>
            </div>

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
                    <div className="w-1 h-1 rounded-full bg-[#C49A3C] shrink-0" />
                    {c}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="px-8 pb-8">
          <button
            onClick={onClose}
            className="w-full py-3 rounded-full text-white hover:opacity-90 active:scale-[0.97] transition-all"
            style={{ backgroundColor: coach.color, fontFamily: "'Bebas Neue', sans-serif", letterSpacing: '0.08em' }}
          >
            Close Profile
          </button>
        </div>
      </div>
    </div>
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
            <Users size={16} className="text-[#C49A3C]" />
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
