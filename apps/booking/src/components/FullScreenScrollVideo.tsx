import { useState, useRef, useEffect, useCallback } from 'react';

interface FullScreenScrollVideoProps {
  children?: React.ReactNode;
}

export function FullScreenScrollVideo({ children }: FullScreenScrollVideoProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const animationFrameRef = useRef<number | null>(null);

  const [scrollProgress, setScrollProgress] = useState(0);
  const [isAutoPlayMode, setIsAutoPlayMode] = useState(true);
  const [isMuted, setIsMuted] = useState(true);
  const [videoDuration, setVideoDuration] = useState(9);

  const handleLoadedMetadata = () => {
    const video = videoRef.current;
    if (video && video.duration && !isNaN(video.duration)) {
      setVideoDuration(video.duration);
    }
  };

  // Scroll handler with RAF for smooth 60fps scrubbing
  const handleScroll = useCallback(() => {
    const container = containerRef.current;
    const video = videoRef.current;
    if (!container || !video) return;

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }

    animationFrameRef.current = requestAnimationFrame(() => {
      const rect = container.getBoundingClientRect();
      const windowHeight = window.innerHeight;
      const totalScrollable = container.offsetHeight - windowHeight;

      if (totalScrollable <= 0) return;

      const scrolled = -rect.top;
      const progress = Math.max(0, Math.min(1, scrolled / totalScrollable));
      setScrollProgress(progress);

      // In scrub mode, link video time directly to scroll position
      if (!isAutoPlayMode && video.duration) {
        try {
          const targetTime = progress * video.duration;
          if (Math.abs(video.currentTime - targetTime) > 0.03) {
            video.currentTime = targetTime;
          }
        } catch {
          /* ignore video scrub error */
        }
      }
    });
  }, [isAutoPlayMode]);

  useEffect(() => {
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [handleScroll]);

  const togglePlayMode = () => {
    const video = videoRef.current;
    if (!video) return;

    if (isAutoPlayMode) {
      try {
        video.pause?.();
      } catch {
        /* ignore pause error */
      }
      setIsAutoPlayMode(false);
      if (video.duration) {
        video.currentTime = scrollProgress * video.duration;
      }
    } else {
      try {
        const p = video.play?.();
        if (p && typeof p.then === 'function') {
          p.then(() => setIsAutoPlayMode(true)).catch(() => {});
        } else {
          setIsAutoPlayMode(true);
        }
      } catch {
        /* ignore play error */
      }
    }
  };

  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !video.muted;
    setIsMuted(video.muted);
  };

  const scrollToBooking = () => {
    const el = document.getElementById('booking-section');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div ref={containerRef} className="relative w-full text-white">
      {/* 1. Full-Screen Fixed Video Background (100vw x 100vh) */}
      <div className="fixed inset-0 -z-10 h-screen w-screen overflow-hidden bg-gray-950">
        <video
          ref={videoRef}
          src="/booking/spark.mp4"
          playsInline
          muted={isMuted}
          loop
          autoPlay
          preload="auto"
          onLoadedMetadata={handleLoadedMetadata}
          className="h-full w-full object-cover scale-[1.02] transition-transform duration-1000 ease-out"
        />

        {/* Ambient Dark Luxury Gradient Overlay */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/65 via-black/40 to-black/85" />
      </div>

      {/* Floating Controls HUD in Bottom Right */}
      <div className="fixed bottom-6 right-6 z-40 flex items-center gap-2 rounded-full border border-white/20 bg-black/60 px-3.5 py-2 shadow-2xl backdrop-blur-xl">
        {/* Timestamp & Progress */}
        <div className="text-[11px] font-mono tracking-wider text-gray-300 pr-2 border-r border-white/20">
          {(scrollProgress * videoDuration).toFixed(1)}s / {videoDuration.toFixed(0)}s
        </div>

        {/* Scroll Scrub / Auto-Play Toggle */}
        <button
          type="button"
          onClick={togglePlayMode}
          className="flex h-8 items-center gap-1.5 rounded-full px-2.5 text-xs font-semibold text-white transition hover:bg-white/20"
          title={isAutoPlayMode ? 'Switch to scroll-controlled scrubbing' : 'Switch to continuous auto-play'}
        >
          {isAutoPlayMode ? (
            <>
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Playing</span>
            </>
          ) : (
            <>
              <span className="h-2 w-2 rounded-full bg-amber-400" />
              <span>Scroll Scrub</span>
            </>
          )}
        </button>

        {/* Mute/Unmute */}
        <button
          type="button"
          onClick={toggleMute}
          className="flex h-8 w-8 items-center justify-center rounded-full text-white transition hover:bg-white/20"
          title={isMuted ? 'Unmute video audio' : 'Mute video audio'}
        >
          {isMuted ? (
            <svg className="h-4 w-4 text-gray-400" fill="currentColor" viewBox="0 0 24 24">
              <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z" />
            </svg>
          ) : (
            <svg className="h-4 w-4 text-teal-400" fill="currentColor" viewBox="0 0 24 24">
              <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
            </svg>
          )}
        </button>
      </div>

      {/* 2. Scroll Storytelling Stage 1: Full-Screen Hero Viewport */}
      <section className="relative flex min-h-screen flex-col items-center justify-center px-6 text-center">
        <div className="max-w-3xl space-y-5">
          <div className="inline-flex items-center gap-2 rounded-full border border-teal-400/40 bg-teal-950/60 px-4 py-1.5 text-xs font-semibold tracking-widest text-teal-300 backdrop-blur-md">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
            HOTEL SPARK
          </div>

          <h1 className="text-4xl sm:text-6xl md:text-7xl font-extrabold tracking-tight text-white drop-shadow-2xl">
            Welcome to Hotel Spark
          </h1>

          <p className="mx-auto max-w-2xl text-base sm:text-xl text-gray-200 drop-shadow-lg leading-relaxed">
            Where luxury meets the ocean. Experience contemporary coastal elegance, bespoke hospitality, and effortless relaxation.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
            <button
              type="button"
              onClick={scrollToBooking}
              className="inline-flex items-center gap-2 rounded-full bg-teal-500 px-8 py-3.5 text-sm font-bold text-gray-950 shadow-lg shadow-teal-500/30 transition hover:bg-teal-400 hover:scale-105 active:scale-95"
            >
              <span>Find A Room</span>
              <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
              </svg>
            </button>

            <button
              type="button"
              onClick={() => {
                const el = document.getElementById('story-suites');
                el?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/10 px-6 py-3.5 text-sm font-semibold text-white backdrop-blur-md transition hover:bg-white/20 hover:border-white/50"
            >
              <span>Explore Hotel</span>
            </button>
          </div>
        </div>

        {/* Scroll Prompt at Bottom of Hero */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1.5 text-xs text-gray-400 tracking-wider">
          <span className="animate-bounce">↓</span>
          <span>SCROLL TO EXPLORE</span>
        </div>
      </section>

      {/* 3. Scroll Storytelling Stage 2: Suites & Living */}
      <section id="story-suites" className="relative flex min-h-screen items-center px-6 py-24">
        <div className="mx-auto max-w-5xl w-full">
          <div className="max-w-xl rounded-3xl border border-white/20 bg-black/60 p-8 sm:p-10 shadow-2xl backdrop-blur-2xl">
            <span className="inline-block rounded-md bg-teal-500/20 px-3 py-1 text-xs font-bold tracking-wider text-teal-300 border border-teal-400/30">
              01 · SIGNATURE SUITES
            </span>
            <h2 className="mt-4 text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
              Crafted For Distinction
            </h2>
            <p className="mt-3 text-base text-gray-200 leading-relaxed">
              Every room at Hotel Spark is curated for effortless comfort — from plush custom King bedding and marble soaking tubs to panoramic private oceanview terraces.
            </p>
            <div className="mt-6 flex flex-wrap gap-2 text-xs font-semibold text-emerald-300">
              <span className="rounded-lg bg-white/10 px-3 py-1.5 backdrop-blur-sm border border-white/10">
                ✓ Ocean Balconies
              </span>
              <span className="rounded-lg bg-white/10 px-3 py-1.5 backdrop-blur-sm border border-white/10">
                ✓ 24/7 In-Room Dining
              </span>
              <span className="rounded-lg bg-white/10 px-3 py-1.5 backdrop-blur-sm border border-white/10">
                ✓ Ultra High-Speed WiFi
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Scroll Storytelling Stage 3: Direct Privileges */}
      <section className="relative flex min-h-screen items-center px-6 py-24">
        <div className="mx-auto max-w-5xl w-full flex justify-end">
          <div className="max-w-xl rounded-3xl border border-white/20 bg-black/60 p-8 sm:p-10 shadow-2xl backdrop-blur-2xl">
            <span className="inline-block rounded-md bg-amber-500/20 px-3 py-1 text-xs font-bold tracking-wider text-amber-300 border border-amber-400/30">
              02 · DIRECT GUEST ADVANTAGE
            </span>
            <h2 className="mt-4 text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
              Best Rate & Instant Sync
            </h2>
            <p className="mt-3 text-base text-gray-200 leading-relaxed">
              Skip OTA middleman markups. Direct reservations on our website guarantee our lowest rates, priority room allocation, and instant confirmation from Hotel Spark.
            </p>
            <div className="mt-6 flex flex-wrap gap-2 text-xs font-semibold text-amber-300">
              <span className="rounded-lg bg-white/10 px-3 py-1.5 backdrop-blur-sm border border-white/10">
                ✓ Best Price Guarantee
              </span>
              <span className="rounded-lg bg-white/10 px-3 py-1.5 backdrop-blur-sm border border-white/10">
                ✓ Zero Hidden Fees
              </span>
              <span className="rounded-lg bg-white/10 px-3 py-1.5 backdrop-blur-sm border border-white/10">
                ✓ Instant Confirmation
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* 5. Scroll Storytelling Stage 4: Booking Engine Form */}
      <section id="booking-section" className="relative flex min-h-screen items-center justify-center px-4 py-24">
        <div className="w-full max-w-2xl">
          {children}
        </div>
      </section>
    </div>
  );
}

