import { useNavigate } from 'react-router';
import { UserCircle, ArrowRight } from 'lucide-react';

interface Props {
  title?: string;
  description?: string;
  compact?: boolean;
}

export function ProfileIncompleteState({
  title = 'Nothing here yet',
  description = 'Complete your profile first to unlock this feature and start booking classes.',
  compact = false,
}: Props) {
  const navigate = useNavigate();

  return (
    <div className={`flex flex-col items-center justify-center text-center ${compact ? 'py-8 px-4' : 'py-14 px-6'}`}>
      <div className={`rounded-2xl bg-[#745b3c]/08 border border-[#745b3c]/20 flex items-center justify-center mb-4 ${compact ? 'w-12 h-12' : 'w-16 h-16'}`}>
        <UserCircle size={compact ? 22 : 28} className="text-[#745b3c]" />
      </div>
      <h3
        className="text-[#1E2A35] mb-1"
        style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: compact ? '1.1rem' : '1.3rem', letterSpacing: '0.05em' }}
      >
        {title}
      </h3>
      <p className="text-[#8A7E6E] text-sm leading-relaxed max-w-xs">
        {description}
      </p>
      <button
        onClick={() => navigate('/profile-setup')}
        className="mt-5 flex items-center gap-2 bg-[#745b3c] text-white px-6 py-3 rounded-full text-sm font-bold shadow-[0_4px_16px_rgba(116,91,60,0.3)] hover:bg-[#5e4a30] active:scale-[0.97] transition-all"
        style={{ fontFamily: "'Bebas Neue', sans-serif", letterSpacing: '0.07em' }}
      >
        Complete Profile <ArrowRight size={15} />
      </button>
    </div>
  );
}
