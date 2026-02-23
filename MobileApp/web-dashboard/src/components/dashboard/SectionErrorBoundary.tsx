import React from 'react';
import * as Sentry from '@sentry/react';

interface Props {
  children: React.ReactNode;
  fallbackMessage: string;
  retryLabel: string;
}

interface State {
  hasError: boolean;
  retryKey: number;
}

/**
 * Lightweight ErrorBoundary for individual dashboard sections.
 * Isolates render crashes so one broken section doesn't take down the entire dashboard.
 * Uses a retryKey to force a full remount on retry, avoiding infinite loops
 * when the same bad data would re-trigger the crash.
 */
class SectionErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false, retryKey: 0 };

  static getDerivedStateFromError(): Partial<State> {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Section render error:', error, errorInfo);
    Sentry.captureException(error, {
      level: 'warning',
      extra: { componentStack: errorInfo.componentStack },
    });
  }

  private handleRetry = () => {
    this.setState((prev) => ({ hasError: false, retryKey: prev.retryKey + 1 }));
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center rounded-xl border border-gray-100 bg-white p-6 py-8 text-center shadow-sm">
          <svg
            className="mb-2 h-8 w-8 text-red-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
            />
          </svg>
          <p className="mb-2 text-sm text-gray-500">{this.props.fallbackMessage}</p>
          <button
            onClick={this.handleRetry}
            className="text-sm font-medium text-primary-600 underline underline-offset-2 hover:text-primary-700"
          >
            {this.props.retryLabel}
          </button>
        </div>
      );
    }
    return <React.Fragment key={this.state.retryKey}>{this.props.children}</React.Fragment>;
  }
}

export default SectionErrorBoundary;
