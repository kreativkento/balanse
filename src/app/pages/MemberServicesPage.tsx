import { useNavigate } from 'react-router';
import { MemberPageShell } from '../components/layout/MemberPageShell';
import { ServicesOfferings } from './ServicesPage';

export default function MemberServicesPage() {
  const navigate = useNavigate();

  return (
    <MemberPageShell searchPlaceholder="Search services…">
      <div className="pt-6 mb-6">
        <p className="text-[#8A7E6E] text-xs uppercase tracking-widest mb-1">Studio</p>
        <h2
          className="text-[#1E2A35] leading-tight"
          style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 'clamp(1.4rem, 3vw, 1.9rem)', letterSpacing: '0.04em' }}
        >
          Services
        </h2>
        <p className="text-[#8A7E6E] text-sm mt-1 max-w-xl">
          One-on-one coaching, private sessions, and recovery treatments tailored to you.
        </p>
      </div>

      <ServicesOfferings onAction={() => navigate('/dashboard')} />
    </MemberPageShell>
  );
}
