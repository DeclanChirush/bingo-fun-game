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

// Registry of all tryDecode functions so resumeAudio can trigger them
// after the AudioContext is unlocked by the first user gesture.
const _decodeQueue: Array<() => void> = [];

export function resumeAudio() {
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume().then(() => {
      // Context just unlocked — flush any pending decodes
      _decodeQueue.forEach(fn => fn());
    });
  } else {
    // Context already running — flush immediately
    _decodeQueue.forEach(fn => fn());
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
const LOSER_SOUNDS = [playSadTrombone, playCrowdLaugh, playDramaticSting];
export function playLoserSound() {
  const fn = LOSER_SOUNDS[Math.floor(Math.random() * LOSER_SOUNDS.length)];
  fn();
}

// ── AudioBuffer-based mp3 player ────────────────────────────────────────────
//
// Why not HTMLAudioElement (the previous approach):
//   - cloneNode copies DOM state, NOT decoded PCM → clones of unloaded audio
//     play silence. Larger files (sa.mp3, amoung-us.mp3) weren't buffered yet.
//   - HTMLAudioElement creates a full OS media pipeline per instance — very
//     heavy on mobile, causes heat + RAM pressure.
//   - currentTime = 0 stalls briefly on Android Chrome under memory pressure.
//
// AudioContext + AudioBuffer:
//   - fetch → decodeAudioData ONCE → raw PCM lives in one AudioBuffer (~2-4 MB
//     total for all 12 sounds vs ~36 media pipelines before).
//   - Each play() creates a BufferSourceNode: lightweight (~1 KB), no DOM,
//     hardware-accelerated, instant start. Single-use by spec — correct pattern.
//   - All 12 sounds share the single AudioContext already used by the game.
//   - Zero latency, works identically on iOS Safari, Android Chrome, desktop.
//
// Loading strategy:
//   - fetch starts immediately at module load (browser caches the network req).
//   - decodeAudioData is deferred until the first user gesture via getCtx(),
//     because AudioContext requires user interaction on mobile before it unlocks.
//   - If the context is still suspended at module load time, we retry decode
//     after resumeAudio() unlocks it (called on every user interaction already).

function makeMp3Player(src: string) {
  let buffer: AudioBuffer | null = null;
  let arrayBuf: ArrayBuffer | null = null;
  let decoding = false;

  // Step 1: fetch the raw bytes immediately (no AudioContext needed yet)
  fetch(src)
    .then(r => r.arrayBuffer())
    .then(ab => {
      arrayBuf = ab;
      tryDecode();
    })
    .catch(() => {}); // missing file — silently skip

  // Step 2: decode into AudioBuffer once we have bytes AND a running context
  function tryDecode() {
    if (buffer || decoding || !arrayBuf) return;
    const ctx = getCtx();
    if (ctx.state === 'suspended') return; // wait for user gesture
    decoding = true;
    // decodeAudioData detaches the ArrayBuffer, so we must slice a copy
    ctx.decodeAudioData(arrayBuf.slice(0), decoded => {
      buffer = decoded;
      arrayBuf = null; // free the raw bytes — buffer holds the PCM now
      decoding = false;
    }, () => { decoding = false; });
  }

  // Register so resumeAudio() can trigger decode after context unlocks
  _decodeQueue.push(tryDecode);

  return (volume = 1.0) => {
    // If context just got unlocked (first tap), try to finish decoding now
    tryDecode();
    if (!buffer) return; // still loading
    const ctx = getCtx();
    const source = ctx.createBufferSource();
    const gain = ctx.createGain();
    source.buffer = buffer;
    gain.gain.value = volume;
    source.connect(gain);
    gain.connect(ctx.destination);
    source.start(0);
    // BufferSourceNode auto-disconnects when done — no manual cleanup needed
  };
}

export const playFaaah           = makeMp3Player('/sounds/faaah.mp3');
export const playSadViolin       = makeMp3Player('/sounds/sad-violin.mp3');
export const playAmoungUs        = makeMp3Player('/sounds/amoung-us.mp3');
export const playEmotionalDamage = makeMp3Player('/sounds/emotional-damage.mp3');
export const playSpiderMan       = makeMp3Player('/sounds/spiderman.mp3');
export const playMemeFinal       = makeMp3Player('/sounds/meme-final.mp3');
export const playWow             = makeMp3Player('/sounds/wow.mp3');
export const playSuspicious      = makeMp3Player('/sounds/suspicious.mp3');
export const playManSnoring      = makeMp3Player('/sounds/man-snoring.mp3');
export const playOMG             = makeMp3Player('/sounds/omg.mp3');
export const playOMGHellNah      = makeMp3Player('/sounds/omg-hell-nah.mp3');
export const playEndCareer       = makeMp3Player('/sounds/end-career.mp3');
