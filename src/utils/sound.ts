/**
 * Cisco Finesse CTI Softphone Web Audio API Synthesizer
 * Generates authentic ITU-T Q.23 Dual-Tone Multi-Frequency (DTMF) keypad tones
 * and call progress signals without external audio files.
 */

const DTMF_FREQUENCIES: Record<string, [number, number]> = {
  '1': [697, 1209],
  '2': [697, 1336],
  '3': [697, 1477],
  '4': [770, 1209],
  '5': [770, 1336],
  '6': [770, 1477],
  '7': [852, 1209],
  '8': [852, 1336],
  '9': [852, 1477],
  '*': [941, 1209],
  '0': [941, 1336],
  '#': [941, 1477],
};

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const AudioCtxClass =
      window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (AudioCtxClass) {
      audioCtx = new AudioCtxClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

export function playDtmfTone(digit: string, durationMs = 130): void {
  const ctx = getAudioContext();
  const freqs = DTMF_FREQUENCIES[digit];
  if (!ctx || !freqs) return;

  try {
    const now = ctx.currentTime;
    const oscLow = ctx.createOscillator();
    const oscHigh = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscLow.type = 'sine';
    oscHigh.type = 'sine';
    oscLow.frequency.setValueAtTime(freqs[0], now);
    oscHigh.frequency.setValueAtTime(freqs[1], now);

    gainNode.gain.setValueAtTime(0.08, now);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + durationMs / 1000);

    oscLow.connect(gainNode);
    oscHigh.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscLow.start(now);
    oscHigh.start(now);
    oscLow.stop(now + durationMs / 1000);
    oscHigh.stop(now + durationMs / 1000);
  } catch {
    // Ignore audio context errors if browser blocks autoplay
  }
}

export function playCallEventTone(type: 'connect' | 'hold' | 'disconnect' | 'ring'): void {
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';

    if (type === 'connect') {
      osc.frequency.setValueAtTime(523.25, now);
      osc.frequency.setValueAtTime(659.25, now + 0.08);
      gain.gain.setValueAtTime(0.07, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.22);
    } else if (type === 'hold') {
      osc.frequency.setValueAtTime(440, now);
      gain.gain.setValueAtTime(0.05, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.15);
    } else if (type === 'disconnect') {
      osc.frequency.setValueAtTime(480, now);
      osc.frequency.setValueAtTime(360, now + 0.1);
      gain.gain.setValueAtTime(0.07, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.24);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.24);
    } else if (type === 'ring') {
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.setValueAtTime(480, now + 0.12);
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.35);
    }
  } catch {
    // Ignore audio context errors
  }
}
