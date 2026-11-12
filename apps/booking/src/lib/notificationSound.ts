/**
 * Synthesizes an elegant, celebratory hotel booking confirmation chime ("Ding! ✨")
 * using standard browser Web Audio API. Zero external audio file dependency.
 */
let audioCtx: AudioContext | null = null;

if (typeof window !== 'undefined') {
  const unlockAudio = () => {
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume().catch(() => {});
    } else if (!audioCtx) {
      getAudioContext();
    }
  };
  window.addEventListener('click', unlockAudio, { passive: true });
  window.addEventListener('pointerdown', unlockAudio, { passive: true });
  window.addEventListener('keydown', unlockAudio, { passive: true });
}

function getAudioContext(): AudioContext | null {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return null;
    if (!audioCtx || audioCtx.state === 'closed') {
      audioCtx = new AudioCtx();
    }
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
    return audioCtx;
  } catch (err) {
    console.warn('[Audio] AudioContext not available:', err);
    return null;
  }
}

/**
 * Plays a cheerful, celebratory multi-chord chime when booking is confirmed.
 */
export function playBookingSuccessChime() {
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const now = ctx.currentTime;

    // A two-stage celebratory chime: First chime strike, followed 120ms later by a higher resolve chord
    const notes = [
      // Strike 1 (Major chord foundation)
      { freq: 523.25, time: 0, gain: 0.35, decay: 1.4, type: 'sine' as OscillatorType },    // C5
      { freq: 659.25, time: 0, gain: 0.3, decay: 1.3, type: 'triangle' as OscillatorType }, // E5
      { freq: 783.99, time: 0, gain: 0.25, decay: 1.2, type: 'sine' as OscillatorType },    // G5

      // Strike 2 (High bright chime resolution)
      { freq: 1046.5, time: 0.14, gain: 0.4, decay: 1.8, type: 'sine' as OscillatorType },    // C6
      { freq: 1318.51, time: 0.14, gain: 0.35, decay: 1.6, type: 'triangle' as OscillatorType }, // E6
      { freq: 1567.98, time: 0.14, gain: 0.3, decay: 1.5, type: 'sine' as OscillatorType },    // G6
      { freq: 2093.0, time: 0.14, gain: 0.15, decay: 1.0, type: 'sine' as OscillatorType },   // C7 Shimmer
    ];

    notes.forEach(({ freq, time, gain: peakGain, decay, type }) => {
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(freq, now + time);

      gainNode.gain.setValueAtTime(0.00001, now + time);
      gainNode.gain.exponentialRampToValueAtTime(peakGain, now + time + 0.02);
      gainNode.gain.exponentialRampToValueAtTime(0.00001, now + time + decay);

      osc.connect(gainNode);
      gainNode.connect(ctx.destination);

      osc.start(now + time);
      osc.stop(now + time + decay + 0.1);
    });

    console.log('[BookingConfirmation] 🛎️ Booking confirmation chime played');
  } catch (err) {
    console.warn('[BookingConfirmation] Failed to play sound:', err);
  }
}

