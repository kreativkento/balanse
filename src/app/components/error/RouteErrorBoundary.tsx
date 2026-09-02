import { isRouteErrorResponse, useLocation, useNavigate, useRouteError } from 'react-router';
import { ErrorScreen, homeLabelFor, homePathFor } from './ErrorScreen';

function errorDetails(error: unknown): string | undefined {
  if (error instanceof Error) return error.stack ?? error.message;
  if (typeof error === 'string') return error;
  if (isRouteErrorResponse(error) && error.data != null) {
    return typeof error.data === 'string' ? error.data : JSON.stringify(error.data, null, 2);
  }
  return undefined;
}

export function RouteErrorBoundary() {
  const error = useRouteError();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const homeTo = homePathFor(pathname);

  let code = '500';
  let title = 'Something went off balance';
  let description = 'This page ran into a problem. Try again, or head back and continue from there.';

  if (isRouteErrorResponse(error)) {
    code = String(error.status);
    if (error.status === 404) {
      title = 'Page not found';
      description = 'This path isn’t part of BALANSÉ. Check the URL or go back to a known page.';
    } else if (error.status === 401 || error.status === 403) {
      title = 'You don’t have access';
      description = 'Sign in with an account that can view this page, then try again.';
    } else {
      title = error.statusText || title;
      if (typeof error.data === 'string' && error.data.trim()) {
        description = error.data;
      }
    }
  } else if (error instanceof Error && error.message.trim()) {
    description = 'An unexpected error stopped this page from loading. Reloading often clears it.';
  }

  return (
    <ErrorScreen
      code={code}
      title={title}
      description={description}
      details={errorDetails(error)}
      homeTo={homeTo}
      homeLabel={homeLabelFor(pathname)}
      onHome={() => navigate(homeTo)}
      onRetry={() => window.location.reload()}
    />
  );
}
