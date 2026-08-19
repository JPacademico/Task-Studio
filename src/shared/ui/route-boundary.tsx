import { Component, type ErrorInfo, type ReactNode } from 'react';
import { RotateCcw, Unplug } from 'lucide-react';

import { translate } from '@/shared/i18n';
import { Button } from './button';

interface RouteBoundaryProps {
  /** Changing this resets the boundary — one failure must not stick to the app. */
  resetKey: string;
  children: ReactNode;
}

interface RouteBoundaryState {
  error: Error | null;
}

/**
 * Catches a page that fails to render — most often a lazy chunk that never
 * arrived, because the dev server restarted or the network dropped mid-import.
 *
 * Without this, a rejected `import()` leaves the Suspense boundary pending
 * forever and the route simply shows nothing, which is indistinguishable from
 * a hung app. Here it becomes a visible, retryable state.
 */
export class RouteBoundary extends Component<RouteBoundaryProps, RouteBoundaryState> {
  state: RouteBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): RouteBoundaryState {
    return { error };
  }

  componentDidUpdate(previous: RouteBoundaryProps): void {
    // Navigating away from a broken route clears the failure.
    if (previous.resetKey !== this.props.resetKey && this.state.error) {
      this.setState({ error: null });
    }
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('Route failed to render', error, info.componentStack);
  }

  render(): ReactNode {
    const { error } = this.state;
    if (!error) return this.props.children;

    // A stale chunk after a deploy only ever resolves with a fresh document.
    const isChunkFailure = /dynamically imported module|Importing a module script|chunk/i.test(
      error.message,
    );

    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 text-center">
        <span className="grid h-12 w-12 place-items-center rounded-2xl bg-danger/10 text-danger">
          <Unplug className="h-5 w-5" />
        </span>
        <div className="space-y-1">
          <p className="text-sm font-semibold">{translate('error.boundary.title')}</p>
          <p className="mx-auto max-w-sm text-xs leading-relaxed text-content-muted">
            {isChunkFailure
              ? translate('error.boundary.chunk')
              : error.message}
          </p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" onClick={() => this.setState({ error: null })}>
            <RotateCcw className="h-3.5 w-3.5" />
            {translate('error.boundary.retry')}
          </Button>
          <Button size="sm" variant="secondary" onClick={() => window.location.reload()}>
            {translate('error.boundary.reload')}
          </Button>
        </div>
      </div>
    );
  }
}
