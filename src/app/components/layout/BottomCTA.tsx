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
      <div className="md:hidden bg-gradient-to-t from-[#F8F3E8] via-[#F8F3E8]/95 to-transparent pt-2 pb-3 px-5 border-t border-[#D4CDB5]/60">
        <button
          onClick={handleClick}
          className="w-full flex items-center justify-center gap-2 bg-[#745b3c] text-white font-bold text-sm rounded-full py-3 min-h-[44px] shadow-[0_4px_24px_rgba(116,91,60,0.4)] active:scale-[0.97] transition-all hover:bg-[#5e4a30]"
        >
          <Calendar size={16} />
          {label}
        </button>
      </div>

      {/* Desktop: compact footer */}
      <div className="hidden md:block bg-[#1E2A35] border-t border-[#D4CDB5]/20">
        <div className="max-w-6xl mx-auto px-8 py-5 flex flex-col md:flex-row items-center justify-between gap-3">
          <div>
            <h2
              className="text-white leading-none mb-1"
              style={{
                fontFamily: "'Bebas Neue', sans-serif",
                fontSize: '1.75rem',
                letterSpacing: '0.06em',
              }}
            >
              Ready to Find Your Balance?
            </h2>
            <p className="text-[#B0A898] text-sm">
              Join over 200 members across 9 disciplines. Your first class is on us.
            </p>
          </div>
          <button
            onClick={handleClick}
            className="shrink-0 flex items-center gap-2 bg-[#745b3c] text-white font-bold text-sm px-6 py-2.5 rounded-full shadow-[0_4px_24px_rgba(116,91,60,0.4)] hover:bg-[#5e4a30] transition-colors active:scale-[0.97] whitespace-nowrap"
          >
            <Calendar size={16} />
            {label}
          </button>
        </div>

        <div className="border-t border-white/08 max-w-6xl mx-auto px-8 py-2.5 flex items-center justify-between gap-4">
          <img src={logoFooter} alt="BALANSÉ Wellness Hub" className="h-8 w-auto object-contain shrink-0" />
          <p className="text-white/25 text-[11px] tracking-wide">
            © 2026 · All rights reserved
          </p>
        </div>
      </div>
    </>
  );
}