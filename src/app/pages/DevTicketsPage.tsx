import { Navigate } from 'react-router';

/** Legacy route — dev work uses `feedback_system` level 4 at `/development/feedback`. */
export default function DevTicketsPage() {
  return <Navigate to="/development/feedback" replace />;
}
