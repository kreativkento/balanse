import AdminTimeBlockingPage from './AdminTimeBlockingPage';

/** Class calendar only — request queues live on Coach Slots and Coach Cancellations. */
export default function AdminClassSchedulePage() {
  return (
    <AdminTimeBlockingPage
      key="class-schedule"
      variant="class-schedule"
      showClassBlockStatusLegend
    />
  );
}
