import AdminTimeBlockingPage from './AdminTimeBlockingPage';

/** Class calendar only — request queues live on Coach Requests. */
export default function AdminClassSchedulePage() {
  return <AdminTimeBlockingPage key="class-schedule" variant="class-schedule" />;
}
