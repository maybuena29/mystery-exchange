/**
 * Pure Web Audio API synthesizer for the Spin the Wheel feature.
 * No external audio files or network requests needed.
 * Enabled by default; supports mute/unmute persisted in localStorage.
 */

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const AudioContextClass =
      window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

const STORAGE_KEY = 'mystery_wheel_sound_muted';

export function isSoundMuted(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(STORAGE_KEY) === 'true';
}

export function setSoundMuted(muted: boolean): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, muted ? 'true' : 'false');
}

export function toggleSound(): boolean {
  const newMuted = !isSoundMuted();
  setSoundMuted(newMuted);
  return !newMuted; // returns isSoundEnabled
}

/**
 * Short crisp mechanical tick/click sound when a peg hits the flapper.
 */
export function playTickSound(pitch = 1.0): void {
  if (isSoundMuted()) return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    // Frequency drops sharply to simulate physical wooden/plastic peg click
    const baseFreq = 850 * pitch;
    osc.frequency.setValueAtTime(baseFreq, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(120, ctx.currentTime + 0.035);

    gain.gain.setValueAtTime(0.18, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.035);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.04);
  } catch {
    // Gracefully ignore audio synthesis errors
  }
}

/**
 * Festive victory fanfare when the wheel lands on a winner.
 */
export function playVictoryFanfare(): void {
  if (isSoundMuted()) return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    // Uplifting arpeggio: C5 (523.25), E5 (659.25), G5 (783.99), C6 (1046.5)
    const notes = [
      { freq: 523.25, time: 0.0, dur: 0.12 },
      { freq: 659.25, time: 0.12, dur: 0.12 },
      { freq: 783.99, time: 0.24, dur: 0.15 },
      { freq: 1046.5, time: 0.39, dur: 0.65 },
    ];

    notes.forEach((note) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(note.freq, ctx.currentTime + note.time);

      gain.gain.setValueAtTime(0.001, ctx.currentTime + note.time);
      gain.gain.linearRampToValueAtTime(0.28, ctx.currentTime + note.time + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + note.time + note.dur);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(ctx.currentTime + note.time);
      osc.stop(ctx.currentTime + note.time + note.dur);
    });

    // Add bright chime harmonic for the final note
    const chime = ctx.createOscillator();
    const chimeGain = ctx.createGain();
    chime.type = 'triangle';
    chime.frequency.setValueAtTime(2093.0, ctx.currentTime + 0.39); // C7 harmonic
    chimeGain.gain.setValueAtTime(0.12, ctx.currentTime + 0.39);
    chimeGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.39 + 0.6);

    chime.connect(chimeGain);
    chimeGain.connect(ctx.destination);
    chime.start(ctx.currentTime + 0.39);
    chime.stop(ctx.currentTime + 0.39 + 0.65);
  } catch {
    // Gracefully ignore audio synthesis errors
  }
}
