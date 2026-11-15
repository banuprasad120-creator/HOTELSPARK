import { useState, useRef, useEffect } from 'react';

export function HeroVideo() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(true);
  const [hasAudioTrack, setHasAudioTrack] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // Check if video is loaded and has audio
    const handleLoadedMetadata = () => {
      // @ts-expect-error mozHasAudio / webkitAudioDecodedByteCount
      const hasAudio = Boolean(video.mozHasAudio || video.webkitAudioDecodedByteCount || (video.audioTracks && video.audioTracks.length > 0));
      setHasAudioTrack(hasAudio);
    };

    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    // Start autoplay muted safely (compatible with JSDOM / browsers)
    try {
      const playPromise = video.play?.();
      if (playPromise && typeof playPromise.catch === 'function') {
        playPromise.catch(() => {
          setIsPlaying(false);
        });
      }
    } catch {
      setIsPlaying(false);
    }

    return () => {
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
    };
  }, []);

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;
    if (isPlaying) {
      try {
        video.pause?.();
      } catch {}
      setIsPlaying(false);
    } else {
      try {
        const p = video.play?.();
        if (p && typeof p.then === 'function') {
          p.then(() => setIsPlaying(true)).catch(() => {});
        } else {
          setIsPlaying(true);
        }
      } catch {}
    }
  };

  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !video.muted;
    setIsMuted(video.muted);
  };

  const toggleFullscreen = () => {
    const video = videoRef.current;
    if (!video) return;
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    } else {
      video.requestFullscreen().catch(() => {});
    }
  };

  return (
    <div className="relative mb-6 overflow-hidden rounded-2xl border border-gray-200 bg-gray-900 shadow-lg">
      {/* Video Element */}
      <div className="relative aspect-[16/9] w-full overflow-hidden sm:aspect-[21/9] max-h-[380px]">
        <video
          ref={videoRef}
          src="/booking/spark.mp4"
          autoPlay
          loop
          muted
          playsInline
          className="h-full w-full object-cover transition-transform duration-700"
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
        />

        {/* Ambient Dark Gradient Overlay */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-gray-950/85 via-gray-900/35 to-black/30" />

        {/* Top Floating Badge & Action Controls */}
        <div className="absolute top-3 left-3 right-3 flex items-center justify-between">
          <div className="inline-flex items-center gap-2 rounded-full bg-black/50 px-3 py-1 text-xs font-semibold tracking-wider text-amber-300 backdrop-blur-md border border-amber-400/30">
            <span className="inline-block h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            SPARK HOTEL
          </div>

          <div className="flex items-center gap-2">
            {/* Play/Pause Button */}
            <button
              type="button"
              onClick={togglePlay}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-md transition hover:bg-black/75 hover:scale-105"
              aria-label={isPlaying ? 'Pause video' : 'Play video'}
              title={isPlaying ? 'Pause video' : 'Play video'}
            >
              {isPlaying ? (
                <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
                </svg>
              ) : (
                <svg className="h-4 w-4 ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
              )}
            </button>

            {/* Mute/Unmute Button */}
            <button
              type="button"
              onClick={toggleMute}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-md transition hover:bg-black/75 hover:scale-105"
              aria-label={isMuted ? 'Unmute video' : 'Mute video'}
              title={isMuted ? 'Unmute video' : 'Mute video'}
            >
              {isMuted ? (
                <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z" />
                </svg>
              ) : (
                <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
                </svg>
              )}
            </button>

            {/* Fullscreen Button */}
            <button
              type="button"
              onClick={toggleFullscreen}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-md transition hover:bg-black/75 hover:scale-105"
              aria-label="Toggle fullscreen"
              title="Fullscreen"
            >
              <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z" />
              </svg>
            </button>
          </div>
        </div>

        {/* Bottom Headline & Highlights */}
        <div className="absolute bottom-4 left-4 right-4">
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white drop-shadow-md">
            Welcome to Spark Hotel
          </h2>
          <p className="mt-1 text-xs sm:text-sm text-gray-200 drop-shadow line-clamp-2">
            Experience contemporary luxury, world-class dining, and unmatched relaxation.
          </p>

          <div className="mt-3 flex flex-wrap items-center gap-2 pt-1 text-[11px] font-medium text-emerald-300">
            <span className="inline-flex items-center gap-1 rounded-md bg-black/40 px-2 py-0.5 backdrop-blur-sm border border-emerald-400/20">
              ✓ Direct Booking Guarantee
            </span>
            <span className="inline-flex items-center gap-1 rounded-md bg-black/40 px-2 py-0.5 backdrop-blur-sm border border-emerald-400/20">
              ✓ Zero Booking Fees
            </span>
            <span className="inline-flex items-center gap-1 rounded-md bg-black/40 px-2 py-0.5 backdrop-blur-sm border border-emerald-400/20">
              ✓ Direct Hotel Confirmation
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
