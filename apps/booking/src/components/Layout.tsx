import { Link, useLocation } from 'react-router-dom';
import { useConfig } from '../context/ConfigContext';
import { useBookingFlow } from '../context/BookingFlowContext';
import { GuestChatWidget } from './GuestChatWidget';

export function Layout({ children }: { children: React.ReactNode }) {
  const { config } = useConfig();
  const { branding, requestSubmissionStatus, reset } = useBookingFlow();
  const { pathname } = useLocation();
  const isRequestFlow = pathname.startsWith('/request/');
  const isHome = pathname === '/';
  const displayName =
    branding?.displayName ?? config?.displayName ?? 'Hotel Spark';

  const isCheckIn = pathname === '/check-in' || pathname.startsWith('/check-in');

  // Home page has a full-bleed immersive experience with floating glass header
  if (isHome) {
    return (
      <div className="haip-booking relative min-h-screen w-full overflow-x-hidden text-gray-900">
        {/* Floating Glassmorphic Navigation Header */}
        <header className="fixed top-0 left-0 right-0 z-50 border-b border-white/10 bg-black/40 backdrop-blur-md">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
            <Link
              to="/"
              className="flex items-center gap-2.5 text-lg font-bold tracking-tight text-white transition hover:opacity-90"
            >
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-teal-500/20 text-base text-teal-400 border border-teal-400/30">
                ✨
              </span>
              <span>{displayName}</span>
            </Link>

            <div className="flex items-center gap-3">
              <a
                href="http://localhost:5173/"
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-full border border-teal-400/40 bg-teal-500/20 px-3.5 py-1.5 text-xs font-semibold text-teal-200 backdrop-blur-sm transition hover:bg-teal-500/30 hover:border-teal-400 flex items-center gap-1.5"
                title="Open Hotel Spark SaaS PMS Dashboard"
              >
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse"></span>
                PMS Dashboard
              </a>
              <Link
                to="/manage"
                className="rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-xs font-semibold text-white backdrop-blur-sm transition hover:bg-white/20 hover:border-white/40"
              >
                Manage booking
              </Link>
            </div>
          </div>
        </header>

        {/* Full-Bleed Content */}
        <main className="w-full">{children}</main>
        <GuestChatWidget />
      </div>
    );
  }

  const isWide = isRequestFlow || pathname === '/results';

  return (
    <div
      className={`haip-booking min-h-screen ${isCheckIn ? '' : 'bg-gray-50'}`}
      style={{ background: isCheckIn ? '#f0f0f6' : undefined }}
      data-haip-check-in={isCheckIn ? 'true' : undefined}
    >
      {!isCheckIn && (
        <header
          className="border-b border-gray-200 bg-white"
          style={{ borderTopWidth: 4, borderTopColor: 'var(--haip-primary, #06bdb4)' }}
        >
          <div className={`mx-auto flex items-center justify-between px-4 py-4 ${isWide ? 'max-w-5xl' : 'max-w-3xl'}`}>
            <Link
              to="/"
              className="text-lg font-semibold text-gray-900"
              aria-disabled={requestSubmissionStatus === 'pending'}
              tabIndex={requestSubmissionStatus === 'pending' ? -1 : undefined}
              onClick={(event) => {
                if (requestSubmissionStatus === 'pending') {
                  event.preventDefault();
                  return;
                }
                if (pathname === '/request/received') reset();
              }}
            >
              {displayName}
            </Link>
            <div className="flex items-center gap-3">
              <a
                href="http://localhost:5173/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-teal-800 bg-teal-50 border border-teal-200 px-3 py-1.5 rounded-lg hover:bg-teal-100 transition shadow-xs"
                title="Open Hotel Spark SaaS PMS Dashboard"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                PMS Dashboard
              </a>
              {!isRequestFlow && (
                <Link
                  to="/manage"
                  className="text-sm font-medium"
                  style={{ color: 'var(--haip-accent, #f2641b)' }}
                >
                  Manage booking
                </Link>
              )}
            </div>
          </div>
        </header>
      )}
      <main className={`mx-auto px-4 py-6 ${isWide ? 'max-w-5xl' : 'max-w-3xl'}`}>{children}</main>
      {!isCheckIn && (
        <footer className={`mx-auto px-4 py-6 text-center text-xs text-gray-400 ${isWide ? 'max-w-5xl' : 'max-w-3xl'}`}>
          Commission-free direct booking · Powered by HAIP
        </footer>
      )}
      <GuestChatWidget />
    </div>
  );
}
