// Web Audio API sound engine — no external files needed
let audioCtx: AudioContext | null = null;

function getCtx(): AudioContext {
  if (!audioCtx) audioCtx = new AudioContext();
  return audioCtx;
}

function playTone(
  freq: number,
  type: OscillatorType,
  duration: number,
  gainVal: number,
  startTime: number,
  ctx: AudioContext
) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.type = type;
  osc.frequency.setValueAtTime(freq, startTime);
  gain.gain.setValueAtTime(gainVal, startTime);
  gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
  osc.start(startTime);
  osc.stop(startTime + duration);
}

export function playMark() {
  const ctx = getCtx();
  const now = ctx.currentTime;
  playTone(523.25, 'sine', 0.15, 0.4, now, ctx);       // C5
  playTone(659.25, 'sine', 0.15, 0.3, now + 0.1, ctx);  // E5
}

export function playWin() {
  const ctx = getCtx();
  const now = ctx.currentTime;
  const melody = [523, 659, 784, 1047, 1319, 1047, 784, 659, 523];
  melody.forEach((freq, i) => {
    playTone(freq, 'sine', 0.25, 0.35, now + i * 0.12, ctx);
  });
  // Harmony
  const harmony = [392, 523, 659, 784, 1047, 784, 659, 523, 392];
  harmony.forEach((freq, i) => {
    playTone(freq, 'triangle', 0.2, 0.2, now + i * 0.12, ctx);
  });
}

export function playDraw() {
  const ctx = getCtx();
  const now = ctx.currentTime;
  playTone(440, 'sine', 0.1, 0.3, now, ctx);
  playTone(554, 'sine', 0.1, 0.3, now + 0.12, ctx);
  playTone(659, 'sine', 0.15, 0.3, now + 0.24, ctx);
}

export function playBingo() {
  const ctx = getCtx();
  const now = ctx.currentTime;
  // Fanfare
  const fanfare = [392, 523, 659, 784, 659, 784, 1047];
  fanfare.forEach((freq, i) => {
    playTone(freq, 'sawtooth', 0.3, 0.4, now + i * 0.1, ctx);
    playTone(freq * 1.5, 'sine', 0.15, 0.2, now + i * 0.1, ctx);
  });
}

export function playClick() {
  const ctx = getCtx();
  const now = ctx.currentTime;
  playTone(800, 'square', 0.05, 0.2, now, ctx);
}

export function resumeAudio() {
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
}
