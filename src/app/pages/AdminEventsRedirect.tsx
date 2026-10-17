import { Navigate, useSearchParams } from 'react-router';

/** Legacy `/admin-events` → Class Schedule with assign query preserved. */
export default function AdminEventsRedirect() {
  const [searchParams] = useSearchParams();
  const edit = searchParams.get('edit');
  const assign = searchParams.get('assign');
  const id = assign ?? edit;
  const target = id ? `/admin-classes?assign=${encodeURIComponent(id)}` : '/admin-classes';
  return <Navigate to={target} replace />;
}
