import AdminTimeBlockingPage from './AdminTimeBlockingPage';

/** Member class calendar — admin-style filters; active, completed, and cancelled blocks only. */
export default function MemberClassSchedule() {
  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-[#F8F3E8]">
      <AdminTimeBlockingPage
        key="member-class-schedule"
        variant="member-class-schedule"
        showClassBlockStatusLegend
      />
    </div>
  );
}
