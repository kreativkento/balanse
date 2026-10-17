import AdminTimeBlockingPage from './AdminTimeBlockingPage';

/** Studio class calendar — same data/views as admin; staff may open vacant slots only. */
export default function StaffTimeSlotsPage() {
  return <AdminTimeBlockingPage key="staff-time-slots" variant="staff-time-slots" />;
}
