import { useEffect, useState, useRef } from 'react';
import './SuspenseReveal.css';

interface Props {
  number: number | null;
  callerName: string;
}

const NUMBER_QUIPS: Record<number, string> = {
  1:  'First! 🥇',
  7:  'Lucky 7! 🍀',
  13: 'Unlucky for some 🪄',
  21: 'Blackjack! ♠️',
  25: 'The last one! 🎯',
  11: 'Legs eleven! 🦵🦵',
  69: 'Nice 😏',
  8:  'Snowman! ⛄',
  22: 'Two little ducks! 🦆🦆',
  3:  'Cup of tea! 🍵',
};

const DEFAULT_QUIPS = [
  'Fingers crossed! 🤞',
  'Here we go!',
  'Pick this one! 🙏',
  'Boom! 💥',
  "Let's GO!",
  'Pray! 🙏',
  'Check your card!',
  'Mark it! ✅',
];

export default function SuspenseReveal({ number, callerName }: Props) {
  const [phase, setPhase] = useState<'idle' | 'suspense' | 'reveal' | 'done'>('idle');
  const [displayNum, setDisplayNum] = useState<number | null>(null);
  const [quip, setQuip] = useState('');
  const prevNum = useRef<number | null>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    if (number === null || number === prevNum.current) return;
    prevNum.current = number;

    timers.current.forEach(clearTimeout);
    timers.current = [];

    setPhase('suspense');
    setDisplayNum(null);

    const t1 = setTimeout(() => {
      setDisplayNum(number);
      setQuip(NUMBER_QUIPS[number] ?? DEFAULT_QUIPS[Math.floor(Math.random() * DEFAULT_QUIPS.length)]);
      setPhase('reveal');
    }, 650);

    const t2 = setTimeout(() => setPhase('done'), 2100);
    const t3 = setTimeout(() => setPhase('idle'), 2500);

    timers.current = [t1, t2, t3];
  }, [number]);

  if (phase === 'idle') return null;

  const isVisible = phase === 'suspense' || phase === 'reveal';

  return (
    <div className={`suspense-reveal sr-phase-${phase} ${isVisible ? 'sr-visible' : ''}`}>
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

      <div className="sr-text">
        <span className="sr-caller">{callerName} called</span>
        {(phase === 'reveal' || phase === 'done') && (
          <span className="sr-quip">{quip}</span>
        )}
        {phase === 'suspense' && (
          <span className="sr-quip" style={{ opacity: 0.4 }}>calling…</span>
        )}
      </div>
    </div>
  );
}
