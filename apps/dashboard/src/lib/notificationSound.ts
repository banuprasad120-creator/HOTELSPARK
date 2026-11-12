/**
 * Synthesizes a luxury 5-star hotel desk bell chime ("Ding! 🛎️")
 * using the standard browser Web Audio API.
 * Works seamlessly offline with 0 external sound files or network requests.
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
 * Plays a rich, resonant hotel concierge brass bell chime.
 */
export function playBookingChime() {
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const now = ctx.currentTime;

    // Harmonic frequencies modeling a classic resonant hotel desk bell
    // Fundamental tone at ~1046.5 Hz (C6), second harmonic at ~1568 Hz (G6),
    // and high shimmer at ~2093 Hz (C7) and ~3136 Hz (G7)
    const tones = [
      { freq: 1046.5, gain: 0.45, decay: 2.2, type: 'sine' as OscillatorType },
      { freq: 1567.98, gain: 0.35, decay: 1.8, type: 'triangle' as OscillatorType },
      { freq: 2093.0, gain: 0.2, decay: 1.2, type: 'sine' as OscillatorType },
      { freq: 3136.0, gain: 0.08, decay: 0.7, type: 'sine' as OscillatorType },
    ];

    tones.forEach(({ freq, gain: peakGain, decay, type }) => {
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(freq, now);

      // Instant strike attack, smooth exponential decay
      gainNode.gain.setValueAtTime(peakGain, now);
      gainNode.gain.exponentialRampToValueAtTime(0.00001, now + decay);

      osc.connect(gainNode);
      gainNode.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + decay + 0.1);
    });

    console.log('[NotificationSound] 🛎️ Hotel booking desk bell chime played');
  } catch (err) {
    console.warn('[NotificationSound] Failed to play chime:', err);
  }
}

