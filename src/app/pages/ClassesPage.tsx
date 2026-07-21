import { useNavigate } from 'react-router';
import { ChevronRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const CLASSES = [
  {
    id: 1,
    name: 'Calisthenics',
    img: 'https://images.unsplash.com/photo-1758274539089-8b2bd10eee92?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=600',
    description:
      'Build real strength using only your bodyweight. Master foundational movements and progressions at your own pace.',
  },
  {
    id: 2,
    name: 'Yoga',
    img: 'https://images.unsplash.com/photo-1767611120077-3697335ec748?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=600',
    description:
      'Reconnect mind and body through guided breathwork, flowing postures, and deep restorative holds.',
  },
  {
    id: 3,
    name: 'Animal Flow',
    img: 'https://images.unsplash.com/photo-1717500252780-036bfd89f810?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=600',
    description:
      'Ground-based movement inspired by animal locomotion. Develops mobility, coordination, and fluid strength.',
  },
  {
    id: 4,
    name: 'Groundworks',
    img: 'https://images.unsplash.com/photo-1701824429245-ce783f1dc026?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=600',
    description:
      'Deep floor work focusing on joint health, primal movement patterns, and body awareness from the ground up.',
  },
  {
    id: 5,
    name: 'Circuit Training',
    img: 'https://images.unsplash.com/photo-1602827114685-efbb2717da9f?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=600',
    description:
      'High-energy stations of cardio and resistance. Burn calories and build endurance in a structured, fun format.',
  },
  {
    id: 6,
    name: 'Mat Pilates',
    img: 'https://images.unsplash.com/photo-1637157216470-d92cd2edb2e8?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=600',
    description:
      'Strengthen your core, improve posture, and cultivate elegant body control through classical Pilates principles.',
  },
  {
    id: 7,
    name: 'Kickboxing',
    img: 'https://images.unsplash.com/photo-1686133368810-24f662f65cad?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=600',
    description:
      'Powerful bag work and combination drills fused with cardio. Release tension and build real functional fitness.',
  },
  {
    id: 8,
    name: 'Capoeira',
    img: 'https://images.unsplash.com/photo-1759352856072-985a4ddab82d?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=600',
    description:
      'Explore the Afro-Brazilian art of Capoeira — a beautiful blend of martial arts, dance, acrobatics, and music.',
  },
  {
    id: 9,
    name: 'Personal Coaching',
    img: 'https://images.unsplash.com/photo-1750698545009-679820502908?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=600',
    description:
      'One-on-one sessions tailored entirely to your goals. Choose your preferred discipline and coach.',
  },
];

export default function ClassesPage() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  const handleBook = () => {
    navigate(isAuthenticated ? '/dashboard' : '/auth');
  };

  return (
    <div className="bg-[#F8F3E8] min-h-screen">
      {/* Header */}
      <div className="border-b border-[#D4CDB5]/60">
        <div className="max-w-6xl mx-auto flex items-center gap-4 px-4 md:px-8 pt-5 pb-4">
          <button
            onClick={() => navigate(-1)}
            className="md:hidden w-10 h-10 rounded-full bg-[#EDE8D8] flex items-center justify-center text-[#1E2A35] hover:bg-[#E3DCC8] transition-colors active:scale-95 shrink-0"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5"/><path d="m12 19-7-7 7-7"/></svg>
          </button>
          <div>
            <h1
              className="text-[#1E2A35] leading-none"
              style={{
                fontFamily: "'Bebas Neue', sans-serif",
                fontSize: 'clamp(1.8rem, 4vw, 2.8rem)',
                letterSpacing: '0.05em',
              }}
            >
              Our Classes
            </h1>
            <p className="text-[#8A7E6E] text-xs mt-0.5">{CLASSES.length} disciplines available</p>
          </div>
        </div>
      </div>

      {/* Class cards grid */}
      <div className="max-w-6xl mx-auto px-4 md:px-8 py-5 md:py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-6">
          {CLASSES.map((cls) => (
            <div
              key={cls.id}
              className="rounded-3xl overflow-hidden bg-white border border-[#D4CDB5]/60 shadow-sm flex flex-col"
            >
              {/* Image */}
              <div className="relative h-48 overflow-hidden shrink-0">
                <img
                  src={cls.img}
                  alt={cls.name}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#1E2A35]/60 to-transparent" />
                {/* Class name overlay */}
                <div className="absolute bottom-3 left-4">
                  <h2
                    className="text-white leading-none"
                    style={{
                      fontFamily: "'Bebas Neue', sans-serif",
                      fontSize: '1.6rem',
                      letterSpacing: '0.04em',
                    }}
                  >
                    {cls.name}
                  </h2>
                </div>
              </div>

              {/* Info */}
              <div className="p-4 flex flex-col flex-1">
                <p className="text-[#8A7E6E] text-sm leading-relaxed flex-1">
                  {cls.description}
                </p>

                {/* CTA Button */}
                <button
                  onClick={handleBook}
                  className="mt-4 w-full flex items-center justify-center gap-2 bg-[#C49A3C] text-white font-bold text-sm rounded-full py-3.5 min-h-[48px] shadow-[0_4px_16px_rgba(196,154,60,0.3)] active:scale-[0.97] transition-all hover:bg-[#A67E2A]"
                >
                  Book This Class <ChevronRight size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="h-4" />
      </div>
    </div>
  );
}
