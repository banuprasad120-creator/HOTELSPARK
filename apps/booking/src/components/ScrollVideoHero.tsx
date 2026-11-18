import { useState, useRef, useEffect, useCallback } from 'react';

interface StoryStep {
  id: number;
  tag: string;
  title: string;
  subtitle: string;
  highlight: string;
  icon: string;
}

const STORY_STEPS: StoryStep[] = [
  {
    id: 1,
    tag: 'CHAPTER 01 · WELCOME',
    title: 'Welcome to Spark Hotel',
    subtitle: 'Where timeless elegance meets contemporary coastal luxury. Designed for effortless comfort and unforgettable moments.',
    highlight: 'Oceanfront Ambiance & Prime Location',
    icon: '✨',
  },
  {
    id: 2,
    tag: 'CHAPTER 02 · LIVING',
    title: 'Signature Suites & Rooms',
    subtitle: 'From plush King Suites to oceanfront balconies, every space is curated with bespoke furnishings and modern amenities.',
    highlight: 'Handcrafted Comfort & Panoramic Views',
    icon: '🛏️',
  },
  {
    id: 3,
    tag: 'CHAPTER 03 · HOSPITALITY',
    title: 'Bespoke Guest Experience',
    subtitle: 'Enjoy 24/7 concierge service, curated dining, rapid digital check-in, and personalized attention from arrival to departure.',
    highlight: '5-Star Service & Seamless Hospitality',
    icon: '🍸',
  },
  {
    id: 4,
    tag: 'CHAPTER 04 · PRIVILEGES',
    title: 'Direct Booking Guarantee',
    subtitle: 'Book directly through Spark Hotel to enjoy the guaranteed best rate, zero OTA markups, and instant real-time room confirmation.',
    highlight: 'Zero Hidden Fees & Instant Confirmation',
    icon: '💎',
  },
];

export function ScrollVideoHero({ onBookNowClick }: { onBookNowClick?: () => void }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const animationFrameRef = useRef<number | null>(null);

  const [activeStep, setActiveStep] = useState(0);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [isAutoPlayMode, setIsAutoPlayMode] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [videoDuration, setVideoDuration] = useState(9);

  // Measure video duration once metadata loads
  const handleLoadedMetadata = () => {
    const video = videoRef.current;
    if (video && video.duration && !isNaN(video.duration)) {
      setVideoDuration(video.duration);
    }
  };

  // Scroll handler with RAF for high-performance 60fps scrubbing
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

      // Calculate progress between 0 and 1
      const scrolled = -rect.top;
      const progress = Math.max(0, Math.min(1, scrolled / totalScrollable));
      setScrollProgress(progress);

      // Determine active story chapter
      const stepIndex = Math.min(
        STORY_STEPS.length - 1,
        Math.floor(progress * STORY_STEPS.length),
      );
      setActiveStep(stepIndex);

      // If in scroll-scrub mode (not auto-playing), scrub the video
      if (!isAutoPlayMode && video.duration) {
        try {
          const targetTime = progress * video.duration;
          // Only update if difference is noticeable to keep it smooth
          if (Math.abs(video.currentTime - targetTime) > 0.04) {
            video.currentTime = targetTime;
          }
        } catch {
          // ignore seek errors during rapid scrolling
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

  // Handle mode toggle (Auto-loop vs Scroll-scrub)
  const togglePlayMode = () => {
    const video = videoRef.current;
    if (!video) return;

    if (isAutoPlayMode) {
      // Switch to scroll-scrub mode
      try {
        video.pause?.();
      } catch {
        /* ignore pause error */
      }
      setIsAutoPlayMode(false);
      // Sync video to current scroll progress
      if (video.duration) {
        video.currentTime = scrollProgress * video.duration;
      }
    } else {
      // Switch to auto-loop playback
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

  return (
    <div ref={containerRef} className="relative mb-12 min-h-[170vh] sm:min-h-[200vh]">
      {/* Sticky Stage Container */}
      <div className="sticky top-16 z-10 py-4">
        {/* Header Ribbon */}
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gray-200 bg-white/90 p-3 shadow-sm backdrop-blur-md">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-teal-50 text-base text-teal-600 shadow-sm border border-teal-200">
              ✨
            </span>
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-teal-800">
                Spark Hotel Showcase
              </div>
              <div className="text-[11px] text-gray-500">
                {isAutoPlayMode ? '▶ Continuous Play' : '↕ Scroll to Scrub Video Animation'}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Scroll Scrub / Auto-Play Toggle */}
            <button
              type="button"
              onClick={togglePlayMode}
              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-gray-700 shadow-sm transition hover:bg-gray-50 hover:text-gray-900"
              title={isAutoPlayMode ? 'Switch to scroll-controlled scrubbing' : 'Switch to continuous auto-play'}
            >
              {isAutoPlayMode ? (
                <>
                  <svg className="h-3.5 w-3.5 text-amber-500" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                  <span>Use Scroll Scrub</span>
                </>
              ) : (
                <>
                  <svg className="h-3.5 w-3.5 text-teal-600" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                  <span>Auto-Play</span>
                </>
              )}
            </button>

            {/* Mute/Unmute */}
            <button
              type="button"
              onClick={toggleMute}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-300 bg-white text-gray-700 shadow-sm transition hover:bg-gray-50"
              title={isMuted ? 'Unmute video audio' : 'Mute video audio'}
            >
              {isMuted ? (
                <svg className="h-4 w-4 text-gray-500" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z" />
                </svg>
              ) : (
                <svg className="h-4 w-4 text-teal-600" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
                </svg>
              )}
            </button>

            {/* Jump to Book Now */}
            <button
              type="button"
              onClick={onBookNowClick}
              className="inline-flex items-center gap-1 rounded-lg bg-teal-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-teal-700"
            >
              <span>Book Room</span>
              <svg className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
              </svg>
            </button>
          </div>
        </div>

        {/* Split-Screen Interactive Stage */}
        <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
          {/* Left Column: Vertical Video in Luxury Phone / Reel Showcase */}
          <div className="mx-auto flex w-full max-w-[340px] flex-col items-center lg:col-span-5 lg:mx-0">
            <div className="relative aspect-[9/16] w-full overflow-hidden rounded-[2.2rem] border-[6px] border-gray-900 bg-gray-950 shadow-2xl ring-1 ring-gray-900/10">
              {/* Speaker Notch */}
              <div className="absolute top-2 left-1/2 z-20 h-3.5 w-24 -translate-x-1/2 rounded-full bg-gray-900/90 backdrop-blur-sm" />

              {/* Video Player */}
              <video
                ref={videoRef}
                src="/spark.mp4"
                playsInline
                muted={isMuted}
                loop={isAutoPlayMode}
                autoPlay={isAutoPlayMode}
                preload="auto"
                onLoadedMetadata={handleLoadedMetadata}
                className="h-full w-full object-cover"
              />

              {/* Subtle Gradient Vignette */}
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30" />

              {/* Live Overlay Indicators */}
              <div className="absolute top-6 left-4 right-4 z-10 flex items-center justify-between text-white text-xs">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-black/50 px-2.5 py-0.5 text-[10px] font-semibold tracking-wider backdrop-blur-sm border border-white/20">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping" />
                  SPARK REEL
                </span>
                <span className="rounded-full bg-black/50 px-2 py-0.5 text-[10px] font-mono text-gray-300 backdrop-blur-sm">
                  {Math.round(scrollProgress * 100)}%
                </span>
              </div>

              {/* Bottom Video Progress Scrub Line */}
              <div className="absolute bottom-4 left-4 right-4 z-10">
                <div className="flex items-center justify-between text-[10px] font-medium text-white/80 pb-1">
                  <span>{STORY_STEPS[activeStep].tag}</span>
                  <span>{(scrollProgress * videoDuration).toFixed(1)}s / {videoDuration.toFixed(0)}s</span>
                </div>
                <div className="h-1 w-full overflow-hidden rounded-full bg-white/20">
                  <div
                    className="h-full bg-gradient-to-r from-teal-400 to-emerald-400 transition-all duration-100 ease-out"
                    style={{ width: `${Math.max(4, scrollProgress * 100)}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Scroll helper prompt below device */}
            <div className="mt-3 flex items-center gap-1.5 text-xs text-gray-500">
              <span className="inline-block animate-bounce text-sm">↓</span>
              <span>Scroll down to advance video & story chapters</span>
            </div>
          </div>

          {/* Right Column: Animated Scrolling Story Cards */}
          <div className="flex flex-col gap-4 lg:col-span-7">
            {STORY_STEPS.map((step, idx) => {
              const isActive = activeStep === idx;
              const isPast = activeStep > idx;

              return (
                <div
                  key={step.id}
                  className={`relative transform rounded-2xl border p-5 transition-all duration-500 ${
                    isActive
                      ? 'scale-[1.02] border-teal-500 bg-white shadow-xl ring-2 ring-teal-500/20'
                      : isPast
                        ? 'border-gray-200 bg-gray-50/70 opacity-60'
                        : 'border-gray-200 bg-white/60 opacity-40'
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <span
                        className={`inline-block rounded-md px-2 py-0.5 text-[11px] font-bold tracking-wider transition-colors ${
                          isActive
                            ? 'bg-teal-50 text-teal-700 border border-teal-200'
                            : 'bg-gray-100 text-gray-500'
                        }`}
                      >
                        {step.tag}
                      </span>
                      <h3
                        className={`mt-1.5 text-lg font-bold transition-colors ${
                          isActive ? 'text-gray-900' : 'text-gray-700'
                        }`}
                      >
                        {step.title}
                      </h3>
                    </div>
                    <span className="text-2xl">{step.icon}</span>
                  </div>

                  <p
                    className={`mt-2 text-sm leading-relaxed transition-colors ${
                      isActive ? 'text-gray-600' : 'text-gray-500'
                    }`}
                  >
                    {step.subtitle}
                  </p>

                  <div className="mt-3 flex items-center gap-2 pt-2 border-t border-gray-100 text-xs font-semibold text-teal-700">
                    <span className="inline-block h-1.5 w-1.5 rounded-full bg-teal-500" />
                    <span>{step.highlight}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

