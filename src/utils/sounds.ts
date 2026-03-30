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

// 😢 Sad Trombone — classic "wah wah wah wahhh"
export function playSadTrombone() {
  const ctx = getCtx();
  const now = ctx.currentTime;
  const notes = [
    { freq: 466, dur: 0.22, start: 0.0 },
    { freq: 440, dur: 0.22, start: 0.22 },
    { freq: 415, dur: 0.22, start: 0.44 },
    { freq: 349, dur: 0.7,  start: 0.66 },
  ];
  notes.forEach(({ freq, dur, start }) => {
    playTone(freq, 'sawtooth', dur, 0.38, now + start, ctx);
    playTone(freq * 0.5, 'sine', dur, 0.18, now + start, ctx);
  });
}

// 😂 Crowd Laugh — short rhythmic "haha" burst
export function playCrowdLaugh() {
  const ctx = getCtx();
  const now = ctx.currentTime;
  // Simulate laughter with noise-like bursts
  for (let i = 0; i < 6; i++) {
    const t = now + i * 0.18;
    playTone(200 + Math.random() * 80, 'sawtooth', 0.1, 0.25, t, ctx);
    playTone(400 + Math.random() * 60, 'sine', 0.08, 0.12, t + 0.04, ctx);
  }
}

// 😱 Dramatic sting — "DUN DUN DUUUN"
export function playDramaticSting() {
  const ctx = getCtx();
  const now = ctx.currentTime;
  playTone(220, 'sawtooth', 0.2, 0.5, now, ctx);
  playTone(220, 'sawtooth', 0.2, 0.5, now + 0.28, ctx);
  playTone(185, 'sawtooth', 0.8, 0.55, now + 0.56, ctx);
  playTone(92, 'sine', 0.8, 0.3, now + 0.56, ctx);
}

// 🎺 Airhorn — meme classic
export function playAirhorn() {
  const ctx = getCtx();
  const now = ctx.currentTime;
  // Airhorn: high sawtooth with quick decay
  for (let i = 0; i < 3; i++) {
    const t = now + i * 0.35;
    playTone(880, 'sawtooth', 0.3, 0.5, t, ctx);
    playTone(1100, 'sawtooth', 0.25, 0.3, t, ctx);
    playTone(660, 'sawtooth', 0.28, 0.2, t, ctx);
  }
}

// 🥁 Drum roll then crash — for suspense before results
export function playDrumRoll(durationMs = 1200) {
  const ctx = getCtx();
  const now = ctx.currentTime;
  const beats = Math.floor(durationMs / 60);
  for (let i = 0; i < beats; i++) {
    const t = now + (i * 0.06) * (1 - i / (beats * 1.5));
    playTone(120 + Math.random() * 20, 'square', 0.04, 0.3 + (i / beats) * 0.2, t, ctx);
  }
  // Crash
  const crashTime = now + durationMs / 1000;
  playTone(800, 'sawtooth', 0.5, 0.5, crashTime, ctx);
  playTone(400, 'sawtooth', 0.5, 0.3, crashTime, ctx);
  playTone(200, 'sine', 0.6, 0.2, crashTime, ctx);
}

// 🎵 Suspense rising tone
export function playSuspense() {
  const ctx = getCtx();
  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.type = 'sine';
  osc.frequency.setValueAtTime(200, now);
  osc.frequency.linearRampToValueAtTime(800, now + 1.2);
  gain.gain.setValueAtTime(0.3, now);
  gain.gain.linearRampToValueAtTime(0.5, now + 1.0);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 1.4);
  osc.start(now);
  osc.stop(now + 1.4);
}

// Pick a random loser sound
// const LOSER_SOUNDS = [playSadTrombone, playCrowdLaugh, playDramaticSting];
const LOSER_SOUNDS = [playSadTrombone, playCrowdLaugh, playDramaticSting];
export function playLoserSound() {
  const fn = LOSER_SOUNDS[Math.floor(Math.random() * LOSER_SOUNDS.length)];
  fn();
}

// Cache the Audio object so it loads once
let mySoundAudio: HTMLAudioElement | null = null;

export function playMySound(volume = 1.0) {
  if (!mySoundAudio) {
    mySoundAudio = new Audio('/sounds/faaah.mp3');
  }
  mySoundAudio.volume = volume;
  mySoundAudio.currentTime = 0; // rewind if already played
  mySoundAudio.play().catch(() => {}); // catch autoplay block silently
}