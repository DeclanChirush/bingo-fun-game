import './NumberPicker.css';

interface Props {
  calledNumbers: Set<number>;
  onPick: (n: number) => void;
  isMyTurn: boolean;
  currentCallerName: string;
}

export default function NumberPicker({ calledNumbers, onPick, isMyTurn, currentCallerName }: Props) {
  const numbers = Array.from({ length: 25 }, (_, i) => i + 1);

  return (
    <div className={`number-picker ${isMyTurn ? 'my-turn' : 'waiting'}`}>
      <div className="picker-header">
        {isMyTurn ? (
          <span className="turn-label my">🎯 Your turn — pick a number!</span>
        ) : (
          <span className="turn-label other">
            ⏳ <strong>{currentCallerName}</strong> is picking…
          </span>
        )}
      </div>

      <div className="picker-chips">
        {numbers.map(n => {
          const used = calledNumbers.has(n);
          return (
            <button
              key={n}
              className={`chip ${used ? 'chip-used' : ''} ${isMyTurn && !used ? 'chip-available' : ''}`}
              onClick={() => isMyTurn && !used && onPick(n)}
              disabled={used || !isMyTurn}
              aria-label={used ? `${n} already called` : `Call ${n}`}
            >
              {n}
            </button>
          );
        })}
      </div>
    </div>
  );
}
