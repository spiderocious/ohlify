import { Component, type ErrorInfo, type ReactNode } from 'react';

import { AppErrorState } from '../app-error-state/app-error-state.js';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, info: ErrorInfo) => void;
}

interface State {
  error: Error | null;
}

/** Mirrors mobile FeatureErrorBoundary — catches descendants, swaps to fallback. */
export class FeatureErrorBoundary extends Component<Props, State> {
  override state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    this.props.onError?.(error, info);
  }

  override render(): ReactNode {
    if (this.state.error) {
      return this.props.fallback ?? <AppErrorState />;
    }
    return this.props.children;
  }
}
