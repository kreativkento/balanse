import { CalendarRange } from 'lucide-react';
import { MemberGreetingHeader } from '../components/layout/DashboardGreetingBar';
import AdminTimeBlockingPage from './AdminTimeBlockingPage';

/** Member class calendar — same views as admin Class Schedule; Active blocks only. */
export default function MemberClassSchedule() {
  return (
    <div className="flex h-full min-h-0 flex-col bg-[#F8F3E8]">
      <div className="mx-auto w-full max-w-7xl shrink-0 px-6">
        <MemberGreetingHeader
          searchPlaceholder="Search sessions…"
          pageHeader={{
            crumb: 'Class Management',
            title: 'Class Schedule',
            icon: <CalendarRange size={14} className="shrink-0 text-[#c49a3c]" aria-hidden />,
          }}
        />
      </div>
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <AdminTimeBlockingPage key="member-class-schedule" variant="member-class-schedule" />
      </div>
    </div>
  );
}
