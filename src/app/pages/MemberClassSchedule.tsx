import { useNavigate } from 'react-router';
import { MemberPageShell } from '../components/layout/MemberPageShell';
import { WeeklySchedule } from './ClassesPage';

/** Member dashboard version of the public class schedules calendar. */
export default function MemberClassSchedule() {
  const navigate = useNavigate();

  return (
    <MemberPageShell searchPlaceholder="Search sessions…">
      <div className="pt-6 mb-6">
        <p className="text-[#8A7E6E] text-xs uppercase tracking-widest mb-1">Class Management</p>
        <h2
          className="text-[#1E2A35] leading-tight"
          style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 'clamp(1.4rem, 3vw, 1.9rem)', letterSpacing: '0.04em' }}
        >
          Class Schedules
        </h2>
        <p className="text-[#8A7E6E] text-sm mt-1">Browse the weekly timetable and reserve your spot.</p>
      </div>

      <WeeklySchedule onBook={() => navigate('/book')} />
    </MemberPageShell>
  );
}
