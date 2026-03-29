import { useEffect, useState, useRef } from 'react';
import './SuspenseReveal.css';

interface Props {
  number: number | null;
  callerName: string;
  onRevealComplete?: () => void;
}

// Fun reactions to number announcements
const NUMBER_QUIPS: Record<number, string> = {
  1:  "FIRST! 🥇",
  7:  "Lucky 7! 🍀",
  13: "Unlucky for some... 🪄",
  21: "Blackjack! ♠️",
  25: "Last one! 🎯",
  11: "LEGS ELEVEN! 🦵🦵",
  69: "Nice 😏",
  8:  "Snowman! ⛄",
  3:  "Three-sy! 🎳",
  22: "Two little ducks! 🦆🦆",
};

const DEFAULT_QUIPS = [
  "Number's up!", "Fingers crossed! 🤞", "Here we go!", 
  "Pick this one! 🙏", "Boom! 💥", "Let's GO!", "Pray! 🙏"
];

export default function SuspenseReveal({ number, callerName, onRevealComplete }: Props) {
  const [phase, setPhase] = useState<'idle' | 'suspense' | 'reveal' | 'done'>('idle');
  const [displayNum, setDisplayNum] = useState<number | null>(null);
  const prevNum = useRef<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    if (number === null || number === prevNum.current) return;
    prevNum.current = number;

    // Clear any running timers
    timerRef.current.forEach(clearTimeout);
    timerRef.current = [];

    // Phase 1: suspense shake
    setPhase('suspense');
    setDisplayNum(null);

    // Phase 2: reveal
    const t1 = setTimeout(() => {
      setDisplayNum(number);
      setPhase('reveal');
    }, 700);

    // Phase 3: done (fade out)
    const t2 = setTimeout(() => {
      setPhase('done');
      onRevealComplete?.();
    }, 2200);

    // Phase 4: idle
    const t3 = setTimeout(() => {
      setPhase('idle');
    }, 2600);

    timerRef.current = [t1, t2, t3];
  }, [number, onRevealComplete]);

  if (phase === 'idle') return null;

  const quip = displayNum !== null
    ? (NUMBER_QUIPS[displayNum] ?? DEFAULT_QUIPS[Math.floor(Math.random() * DEFAULT_QUIPS.length)])
    : null;

  return (
    <div className={`suspense-reveal sr-phase-${phase}`} aria-live="polite">
      <div className="sr-caller">{callerName} called</div>
      <div className="sr-bubble">
        {phase === 'suspense' && (
          <div className="sr-question-marks">
            <span>?</span><span>?</span><span>?</span>
          </div>
        )}
        {(phase === 'reveal' || phase === 'done') && displayNum !== null && (
          <div className="sr-number">{displayNum}</div>
        )}
      </div>
      {quip && <div className="sr-quip">{quip}</div>}
    </div>
  );
}
