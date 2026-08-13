import { useNavigate } from 'react-router';
import { Calendar } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import logoFooter from 'figma:asset/logo_footer.svg';

interface BottomCTAProps {
  label?: string;
}

export function BottomCTA({ label = 'Book / Schedule' }: BottomCTAProps) {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  const handleClick = () => {
    if (isAuthenticated) {
      navigate('/dashboard');
    } else {
      navigate('/auth');
    }
  };

  return (
    <>
      {/* Mobile: sticky bottom bar */}
      <div className="md:hidden bg-gradient-to-t from-[#F8F3E8] via-[#F8F3E8]/95 to-transparent pt-3 pb-5 px-5 border-t border-[#D4CDB5]/60">
        <button
          onClick={handleClick}
          className="w-full flex items-center justify-center gap-2 bg-[#C49A3C] text-white font-bold text-base rounded-full py-4 min-h-[56px] shadow-[0_4px_24px_rgba(196,154,60,0.4)] active:scale-[0.97] transition-all hover:bg-[#A67E2A]"
        >
          <Calendar size={20} />
          {label}
        </button>
      </div>

      {/* Desktop: full-width CTA banner */}
      <div className="hidden md:block bg-[#1E2A35] border-t border-[#D4CDB5]/20">
        <div className="max-w-6xl mx-auto px-8 py-14 flex flex-col md:flex-row items-center justify-between gap-6">
          <div>
            <h2
              className="text-white mb-2"
              style={{
                fontFamily: "'Bebas Neue', sans-serif",
                fontSize: '2.4rem',
                letterSpacing: '0.06em',
              }}
            >
              Ready to Find Your Balance?
            </h2>
            <p className="text-[#B0A898] text-base">
              Join over 200 members across 9 disciplines. Your first class is on us.
            </p>
          </div>
          <button
            onClick={handleClick}
            className="shrink-0 flex items-center gap-2 bg-[#C49A3C] text-white font-bold text-base px-8 py-4 rounded-full shadow-[0_4px_24px_rgba(196,154,60,0.4)] hover:bg-[#A67E2A] transition-colors active:scale-[0.97] whitespace-nowrap"
          >
            <Calendar size={20} />
            {label}
          </button>
        </div>

        {/* Staff access footer strip */}
        <div className="border-t border-white/08 max-w-6xl mx-auto px-8 py-5 flex items-center justify-between gap-6">
          <img src={logoFooter} alt="BALANSÉ Wellness Hub" className="h-14 w-auto object-contain shrink-0" />
          <p className="text-white/25 text-xs tracking-wide">
            © 2026 · All rights reserved
          </p>
        </div>
      </div>
    </>
  );
}