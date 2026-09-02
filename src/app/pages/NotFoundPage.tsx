import { useLocation, useNavigate } from 'react-router';
import { ErrorScreen, homeLabelFor, homePathFor } from '../components/error/ErrorScreen';

export default function NotFoundPage() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const homeTo = homePathFor(pathname);

  return (
    <ErrorScreen
      code="404"
      title="Page not found"
      description="This path isn’t part of BALANSÉ. Check the URL or go back to a known page."
      homeTo={homeTo}
      homeLabel={homeLabelFor(pathname)}
      onHome={() => navigate(homeTo)}
    />
  );
}
