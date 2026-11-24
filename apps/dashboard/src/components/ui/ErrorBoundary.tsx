import { Component, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error) {
    const isChunkError =
      error?.message?.includes('dynamically imported module') ||
      error?.message?.includes('Loading chunk') ||
      error?.message?.includes('Failed to fetch');

    if (isChunkError && typeof window !== 'undefined') {
      const now = Date.now();
      const lastReload = Number(sessionStorage.getItem('last_chunk_reload') || '0');
      // If we haven't auto-reloaded in the last 15 seconds, automatically reload to get fresh bundle
      if (now - lastReload > 15000) {
        sessionStorage.setItem('last_chunk_reload', String(now));
        window.location.reload();
      }
    }
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      const isChunkError =
        this.state.error?.message?.includes('dynamically imported module') ||
        this.state.error?.message?.includes('Loading chunk') ||
        this.state.error?.message?.includes('Failed to fetch');

      return (
        <div className="flex flex-col items-center justify-center py-16 px-4" role="alert">
          <div className="p-3 bg-telivity-orange/10 rounded-full mb-4">
            <AlertTriangle size={24} className="text-telivity-orange" />
          </div>
          <h2 className="text-lg font-semibold text-telivity-navy mb-2">
            {isChunkError ? 'New Update Available' : 'Something went wrong'}
          </h2>
          <p className="text-sm text-telivity-mid-grey mb-4 text-center max-w-md">
            {isChunkError
              ? 'A newer version of Hotel Spark has been deployed. Please reload to load the latest dashboard components.'
              : (this.state.error?.message ?? 'An unexpected error occurred.')}
          </p>
          <button
            onClick={() => {
              if (isChunkError || typeof window !== 'undefined') {
                window.location.reload();
              } else {
                this.setState({ hasError: false, error: undefined });
              }
            }}
            className="flex items-center gap-2 bg-telivity-teal text-white rounded-lg px-4 py-2 text-sm font-semibold hover:bg-telivity-light-teal transition-colors cursor-pointer shadow-xs"
          >
            <RefreshCw size={14} />
            {isChunkError ? 'Reload Latest Dashboard' : 'Try Again'}
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export function QueryError({ onRetry }: { onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4" role="alert">
      <div className="p-3 bg-telivity-orange/10 rounded-full mb-4">
        <AlertTriangle size={24} className="text-telivity-orange" />
      </div>
      <h3 className="text-base font-semibold text-telivity-navy mb-1">Failed to load data</h3>
      <p className="text-sm text-telivity-mid-grey mb-4">Please check your connection and try again.</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="flex items-center gap-2 bg-telivity-teal text-white rounded-lg px-4 py-2 text-sm font-semibold hover:bg-telivity-light-teal transition-colors"
        >
          <RefreshCw size={14} />
          Retry
        </button>
      )}
    </div>
  );
}

export function EmptyState({ icon: Icon, message }: { icon?: React.ComponentType<any>; message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      {Icon && (
        <div className="p-3 bg-telivity-light-grey rounded-full mb-3">
          <Icon size={24} className="text-telivity-mid-grey" />
        </div>
      )}
      <p className="text-sm text-telivity-mid-grey">{message}</p>
    </div>
  );
}
