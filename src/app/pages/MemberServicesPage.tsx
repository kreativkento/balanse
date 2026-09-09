import { useNavigate } from 'react-router';
import { MemberPageShell } from '../components/layout/MemberPageShell';
import { ServicesOfferings } from './ServicesPage';

export default function MemberServicesPage() {
  const navigate = useNavigate();

  return (
    <MemberPageShell searchPlaceholder="Search services…">
      <div className="mb-6 pt-6">
        <p className="mb-1 text-xs uppercase tracking-widest text-[#8A7E6E]">Studio</p>
        <h2
          className="leading-tight text-[#1E2A35]"
          style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 'clamp(1.4rem, 3vw, 1.9rem)', letterSpacing: '0.04em' }}
        >
          Services
        </h2>
      </div>

      <ServicesOfferings onAction={() => navigate('/dashboard')} />
    </MemberPageShell>
  );
}
