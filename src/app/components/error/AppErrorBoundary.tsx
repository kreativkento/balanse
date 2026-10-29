import { Component, type ErrorInfo, type ReactNode } from 'react';
import { ErrorScreen, homeLabelFor, homePathFor, isMemberPortalPath } from './ErrorScreen';

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

export class AppErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('AppErrorBoundary', error, info.componentStack);
  }

  private retry = () => {
    this.setState({ error: null });
    window.location.reload();
  };

  render() {
    if (!this.state.error) return this.props.children;

    const pathname = typeof window !== 'undefined' ? window.location.pathname : '/';
    const homeTo = homePathFor(pathname);
    const homeLabel = homeLabelFor(pathname);
    const memberPortal = isMemberPortalPath(pathname);

    return (
      <div className="min-h-screen bg-[#F8F3E8]">
        <ErrorScreen
          code="500"
          title="Something went off balance"
          description={
            memberPortal
              ? 'The app hit an unexpected error. Try again, or return to your dashboard.'
              : 'The app hit an unexpected error. Try again, or go back to a known page.'
          }
          details={this.state.error.stack ?? this.state.error.message}
          homeTo={homeTo}
          homeLabel={homeLabel}
          onHome={() => window.location.assign(homeTo)}
          onRetry={this.retry}
        />
      </div>
    );
  }
}
