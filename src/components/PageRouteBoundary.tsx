// Wraps every route. While a page's file downloads it shows a small loading
// state (after a short delay, so fast loads don't flash), and if the page
// can't load or throws while rendering it shows Reload and Home instead of
// an empty screen. Stale files after a deploy are handled before this, by
// reloading into the new build (src/lib/staleBuild.ts); this is the fallback.
import { Component, Suspense, useEffect, useState, type ErrorInfo, type ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Loader2 } from '@/components/icons';
import { useAuth } from '@/context/AuthContext';
import { Button } from './ui/button';

const LOADING_DELAY_MS = 400;

function LoadingPage() {
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const timer = window.setTimeout(() => setShown(true), LOADING_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, []);
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-6 text-foreground">
      {shown && (
        <div role="status" aria-live="polite" className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading…
        </div>
      )}
    </main>
  );
}

function PageFailed() {
  const { session } = useAuth();
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-6 text-foreground">
      <div role="alert" className="max-w-md space-y-4 text-center">
        <h1 className="text-xl font-semibold">This page didn't load</h1>
        <p className="text-sm text-muted-foreground">
          Check your connection and reload. If the site was just updated, reloading gets the new version.
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <Button onClick={() => window.location.reload()}>Reload page</Button>
          <Button variant="outline" asChild>
            <Link to={session ? '/home' : '/'}>Back to Home</Link>
          </Button>
        </div>
      </div>
    </main>
  );
}

interface BoundaryProps { children: ReactNode; resetKey: string }
interface BoundaryState { failed: boolean; resetKey: string }

class PageErrorBoundary extends Component<BoundaryProps, BoundaryState> {
  state: BoundaryState = { failed: false, resetKey: this.props.resetKey };

  // A new navigation clears the error, so the next page gets a fresh try.
  static getDerivedStateFromProps({ resetKey }: BoundaryProps, state: BoundaryState) {
    return resetKey === state.resetKey ? null : { failed: false, resetKey };
  }

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: unknown, info: ErrorInfo) {
    // Lands in the bug-report diagnostics (src/lib/diagnostics.ts).
    console.error('Page failed to open', error, info.componentStack);
  }

  render() {
    return this.state.failed ? <PageFailed /> : this.props.children;
  }
}

export default function PageRouteBoundary({ children }: { children: ReactNode }) {
  const location = useLocation();
  return (
    <PageErrorBoundary resetKey={location.key}>
      <Suspense fallback={<LoadingPage />}>{children}</Suspense>
    </PageErrorBoundary>
  );
}
