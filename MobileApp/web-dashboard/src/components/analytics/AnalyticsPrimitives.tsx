import React from 'react';

// ---------------------------------------------------------------------------
// Brand color palette used across analytics charts
// ---------------------------------------------------------------------------

export const BRAND_COLORS = [
  '#2C5530',
  '#C4A962',
  '#4e3a21',
  '#3a7a40',
  '#a67c36',
  '#1a3a1e',
  '#d4b97a',
];

// Named constants for Recharts props that require hex strings
export const BRAND_GREEN = BRAND_COLORS[0];
export const BRAND_GOLD = BRAND_COLORS[1];
export const BRAND_BROWN = BRAND_COLORS[2];

// ---------------------------------------------------------------------------
// Consistent chart tick styling
// ---------------------------------------------------------------------------

export const TICK_STYLE = { fontSize: 11 };

/** Standard grid stroke for CartesianGrid across all charts. */
export const GRID_STROKE = '#f0f0f0';

/** Subset of Recharts PieSectorData used in pie chart labels. */
export interface PieLabelEntry {
  name?: string | number;
  percent?: number;
}

// ---------------------------------------------------------------------------
// Skeleton components
// ---------------------------------------------------------------------------

export const SkeletonKPICard: React.FC = () => (
  <div className="animate-pulse rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
    <div className="mb-3 h-3 w-24 rounded bg-gray-200" />
    <div className="mb-2 h-7 w-20 rounded bg-gray-200" />
    <div className="h-3 w-28 rounded bg-gray-200" />
  </div>
);

export const SkeletonChart: React.FC<{ height?: number }> = ({ height = 280 }) => (
  <div className="animate-pulse rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
    <div className="mb-6 h-4 w-48 rounded bg-gray-200" />
    <div className="rounded bg-gray-100" style={{ height }} />
  </div>
);

// ---------------------------------------------------------------------------
// Empty state
// ---------------------------------------------------------------------------

export const EmptyState: React.FC<{ message: string }> = ({ message }) => (
  <div className="flex flex-col items-center justify-center py-12 text-gray-400" role="status">
    <svg
      className="mb-2 h-10 w-10"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.5}
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z"
      />
    </svg>
    <p className="text-sm">{message}</p>
  </div>
);

// ---------------------------------------------------------------------------
// Section error banner with loading-aware retry
// ---------------------------------------------------------------------------

export interface SectionErrorProps {
  message: string;
  retryLabel: string;
  onRetry: () => void;
  retrying?: boolean;
}

export const SectionError: React.FC<SectionErrorProps> = ({
  message,
  retryLabel,
  onRetry,
  retrying = false,
}) => (
  <div
    className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600"
    role="alert"
  >
    {message}
    <button
      onClick={onRetry}
      disabled={retrying}
      className="ml-2 underline disabled:cursor-not-allowed disabled:no-underline disabled:opacity-50"
      aria-label={`${retryLabel}: ${message}`}
    >
      {retrying ? (
        <span className="inline-flex items-center gap-1">
          <svg className="h-3 w-3 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
          {retryLabel}
        </span>
      ) : (
        retryLabel
      )}
    </button>
  </div>
);

// ---------------------------------------------------------------------------
// Refetching overlay (shown over stale data during period change)
// ---------------------------------------------------------------------------

export const RefetchOverlay: React.FC = () => (
  <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-white/60">
    <svg
      className="h-6 w-6 animate-spin text-brand-600"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  </div>
);

// ---------------------------------------------------------------------------
// RefetchableSection — wraps a section with relative positioning and overlay
// ---------------------------------------------------------------------------

export const RefetchableSection: React.FC<{
  refetching: boolean;
  children: React.ReactNode;
}> = ({ refetching, children }) => (
  <div className="relative">
    {refetching && <RefetchOverlay />}
    {children}
  </div>
);

// ---------------------------------------------------------------------------
// ChartErrorBoundary — catches rendering errors inside chart sections
// ---------------------------------------------------------------------------

interface ChartErrorBoundaryProps {
  fallbackMessage: string;
  retryLabel: string;
  onRetry: () => void;
  retrying?: boolean;
  children: React.ReactNode;
}

interface ChartErrorBoundaryState {
  hasError: boolean;
}

export class ChartErrorBoundary extends React.Component<
  ChartErrorBoundaryProps,
  ChartErrorBoundaryState
> {
  constructor(props: ChartErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): ChartErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    console.error('[ChartErrorBoundary]', error, info.componentStack);
  }

  override render() {
    if (this.state.hasError) {
      return (
        <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
          <SectionError
            message={this.props.fallbackMessage}
            retryLabel={this.props.retryLabel}
            onRetry={() => {
              this.setState({ hasError: false });
              this.props.onRetry();
            }}
            retrying={this.props.retrying}
          />
        </div>
      );
    }
    return this.props.children;
  }
}
