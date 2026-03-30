import { useState, memo } from 'react';
import type { CardState, CompletedLine } from '../utils/multiplayerTypes';
import { cellOnCompletedLine } from '../utils/gameLogic';
import './BingoCard.css';

interface Props {
  card: CardState;
  lastCalledNumber: number | null;
  calledNumbers: Set<number>;
  onCross: (row: number, col: number) => void;
  disabled: boolean;
  onRefresh?: () => void;
  showRefresh?: boolean;
  isMyTurn?: boolean;
  canPick?: boolean;          // FIX #1: separate from isMyTurn — true only when hasn't picked yet
  onPickNumber?: (n: number) => void;
  currentCallerName?: string;
}

const LETTER_COLORS = ['#ff6b9d', '#c44dff', '#4d79ff', '#00d4aa', '#ffd700'];
const LETTERS = ['B', 'I', 'N', 'G', 'O'];

function DiagLine({ type }: { type: 0 | 1 }) {
  if (type === 0) {
    return (
      <line
        x1="2%" y1="2%" x2="98%" y2="98%"
        stroke="url(#diagGrad0)" strokeWidth="4" strokeLinecap="round"
      />
    );
  }
  return (
    <line
      x1="98%" y1="2%" x2="2%" y2="98%"
      stroke="url(#diagGrad1)" strokeWidth="4" strokeLinecap="round"
    />
  );
}

const BingoCell = memo(function BingoCell({
  num, isCrossed, isCalled, isLast, onLine, isWrong, isPickMode, disabled,
  onClick,
}: {
  num: number;
  isCrossed: boolean;
  isCalled: boolean;
  isLast: boolean;
  onLine: boolean;
  isWrong: boolean;
  isPickMode: boolean;
  disabled: boolean;
  onClick: () => void;
}) {
  const classes = [
    'bingo-cell',
    isCrossed                       ? 'crossed'     : '',
    onLine                          ? 'on-line'     : '',
    isLast && !isCrossed            ? 'last-called' : '',
    isCalled && !isCrossed          ? 'callable'    : '',
    isWrong                         ? 'wrong-flash' : '',
    isPickMode && !isCalled         ? 'pick-mode'   : '',
  ].filter(Boolean).join(' ');

  return (
    <button
      className={classes}
      onClick={onClick}
      disabled={disabled}
    >
      <span className="cell-num">{num}</span>
      {isCrossed && (
        <svg className="cross-svg" viewBox="0 0 40 40">
          <line x1="7" y1="7" x2="33" y2="33" strokeLinecap="round" />
          <line x1="33" y1="7" x2="7" y2="33" strokeLinecap="round" />
        </svg>
      )}
    </button>
  );
});

export default function BingoCard({
  card, lastCalledNumber, calledNumbers, onCross, disabled,
  onRefresh, showRefresh,
  isMyTurn = false, canPick = false, onPickNumber, currentCallerName,
}: Props) {
  const [wrongCell, setWrongCell] = useState<[number, number] | null>(null);

  const diag0Done = card.completedLines.some(l => l.type === 'diag' && l.index === 0);
  const diag1Done = card.completedLines.some(l => l.type === 'diag' && l.index === 1);

  // FIX #1: Pick mode is only active when canPick=true (turn is mine AND haven't picked yet)
  const isPickMode = !!onPickNumber && canPick;

  const handleCellClick = (row: number, col: number) => {
    const num = card.numbers[row][col];

    // Pick mode: tap any uncalled number to broadcast it
    if (isPickMode && !calledNumbers.has(num)) {
      onPickNumber!(num);
      return;
    }

    // Normal cross mode
    if (disabled) return;
    if (card.crossed[row][col]) return;
    if (!calledNumbers.has(num)) {
      setWrongCell([row, col]);
      setTimeout(() => setWrongCell(null), 700);
      return;
    }
    onCross(row, col);
  };

  return (
    <div className="bingo-card">
      {/* BINGO letter row */}
      <div className="bingo-letters">
        {LETTERS.map((letter, i) => (
          <div
            key={letter}
            className={`bingo-letter ${card.bingoLetters[i] ? 'crossed-letter' : ''}`}
            style={{ '--lc': LETTER_COLORS[i] } as React.CSSProperties}
          >
            <span className="letter-text">{letter}</span>
            {card.bingoLetters[i] && <span className="letter-strike" />}
          </div>
        ))}
      </div>

      {/* Turn banner — only shown during gameplay */}
      {/* {onPickNumber !== undefined || isMyTurn ? (
        <div className={`pick-banner ${isPickMode ? 'pick-banner-active' : isMyTurn && !canPick ? 'pick-banner-waiting-turn' : 'pick-banner-waiting'}`}>
          {isPickMode ? (
            <span>🎯 <strong>Your turn!</strong> Tap any number to call it</span>
          ) : isMyTurn && !canPick ? (
            <span>✅ Number called! Cross off your card then wait for your next turn</span>
          ) : (
            <span>⏳ <strong>{currentCallerName}</strong> is picking…</span>
          )}
        </div>
      ) : null} */}

      {/* Refresh button (lobby only) */}
      {showRefresh && onRefresh && (
        <button className="refresh-btn" onClick={onRefresh} title="Shuffle card numbers">
          🔀 Shuffle Card
        </button>
      )}

      {/* 5×5 grid */}
      <div className="grid-wrapper">
        <div className="bingo-grid">
          {card.numbers.map((row, rIdx) =>
            row.map((num, cIdx) => {
              const isCrossed = card.crossed[rIdx][cIdx];
              const isCalled = calledNumbers.has(num);
              const isLast = num === lastCalledNumber;
              const onLine = cellOnCompletedLine(card.completedLines, rIdx, cIdx);
              const isWrong = wrongCell?.[0] === rIdx && wrongCell?.[1] === cIdx;

              let cellDisabled: boolean;
              if (isPickMode) {
                cellDisabled = isCalled; // can't pick already-called numbers
              } else {
                cellDisabled = disabled || isCrossed || !isCalled;
              }

              return (
                <BingoCell
                  key={`${rIdx}-${cIdx}`}
                  num={num}
                  isCrossed={isCrossed}
                  isCalled={isCalled}
                  isLast={isLast}
                  onLine={onLine}
                  isWrong={isWrong}
                  isPickMode={isPickMode && !isCalled}
                  disabled={cellDisabled}
                  onClick={() => handleCellClick(rIdx, cIdx)}
                />
              );
            })
          )}

          {card.completedLines.filter(l => l.type === 'row').map(l => (
            <div key={`row-${l.index}`} className="row-strike" style={{ '--ri': l.index } as React.CSSProperties} />
          ))}
          {card.completedLines.filter(l => l.type === 'col').map(l => (
            <div key={`col-${l.index}`} className="col-strike" style={{ '--ci': l.index } as React.CSSProperties} />
          ))}
        </div>

        {(diag0Done || diag1Done) && (
          <svg className="diag-overlay" viewBox="0 0 100 100" preserveAspectRatio="none">
            <defs>
              <linearGradient id="diagGrad0" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#ffd700" />
                <stop offset="100%" stopColor="#ff6b9d" />
              </linearGradient>
              <linearGradient id="diagGrad1" x1="100%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#c44dff" />
                <stop offset="100%" stopColor="#00d4aa" />
              </linearGradient>
            </defs>
            {diag0Done && <DiagLine type={0} />}
            {diag1Done && <DiagLine type={1} />}
          </svg>
        )}
      </div>
    </div>
  );
}
