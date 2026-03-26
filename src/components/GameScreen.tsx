import { useState, useEffect, useRef, useMemo } from 'react';
import type { GameState, CardState } from '../utils/multiplayerTypes';
import { generateCard, applyNumber, isFullBingo } from '../utils/gameLogic';
import BingoCard from './BingoCard';
import NumberPicker from './NumberPicker';
import PlayerList from './PlayerList';
import QuitModal from './QuitModal';
import Confetti from './Confetti';
import { playMark, playWin, resumeAudio } from '../utils/sounds';
import './GameScreen.css';

interface Props {
  myId: string;
  playerName: string;
  roomCode: string;
  isHost: boolean;
  gameState: GameState;
  soundEnabled: boolean;
  onToggleSound: () => void;
  onQuit: () => void;
  onCallNumber: (n: number) => void;
  onClaimBingo: () => void;
  onStartGame?: () => void;
  onNextRound?: () => void;
  onResetGame?: () => void;
  totalRounds?: number;           // ← add this
  onSetTotalRounds?: (n: number) => void;  // ← add this
}

export default function GameScreen({
  myId, playerName, roomCode, isHost, gameState, soundEnabled,
  onToggleSound, onQuit, onCallNumber, onClaimBingo,
  onStartGame, onNextRound, onResetGame, totalRounds = 5, onSetTotalRounds,
}: Props) {
  const [card, setCard] = useState<CardState>(() => generateCard());
  const [showQuit, setShowQuit] = useState(false);
  const [wonRound, setWonRound] = useState(false);
  const [confetti, setConfetti] = useState(false);
  const [copied, setCopied] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const prevPhaseRef = useRef(gameState.phase);
  const prevCalledRef = useRef<number[]>([]);
  const claimedRef = useRef(false);

  const { phase, round, players, callerOrder, callerIndex, calledNumbers, roundWinner } = gameState;

  const isMyTurn = callerOrder[callerIndex] === myId;
  const calledSet = new Set(calledNumbers);
  const lastCalled = calledNumbers[0] ?? null;
  const currentCallerId = callerOrder[callerIndex];
  const currentCallerName = players.find(p => p.id === currentCallerId)?.name ?? '…';
  const me = players.find(p => p.id === myId);
  const roundWinnerName = players.find(p => p.id === roundWinner)?.name ?? '';
  const iWon = roundWinner === myId;
  // Replace direct isFullBingo(card) calls with:
  const hasWon = useMemo(() => isFullBingo(card), [card]);

  // Reset card on new round
  useEffect(() => {
    if (phase === 'playing' && prevPhaseRef.current !== 'playing') {
        claimedRef.current = false; // ← add this
        // Only regenerate if coming from round_end (new round), NOT from lobby
        if (prevPhaseRef.current === 'round_end') {
          setCard(generateCard());
        }
        setWonRound(false);
        setConfetti(false);
        prevCalledRef.current = [];
    }
    prevPhaseRef.current = phase;
  }, [phase]);

  // Auto-apply newly called numbers to card
  useEffect(() => {
    const prev = new Set(prevCalledRef.current);
    const newNums = calledNumbers.filter(n => !prev.has(n));
    if (newNums.length === 0) return;
    prevCalledRef.current = [...calledNumbers];
    setCard(prevCard => {
      let updated = prevCard;
      for (const n of newNums) updated = applyNumber(updated, n);
      return updated;
    });
  }, [calledNumbers]);

  // In the win detection useEffect, add the ref guard:
  useEffect(() => {
    if (wonRound || phase !== 'playing' || claimedRef.current) return;
    if (hasWon) {
      claimedRef.current = true; // ← add this
      setWonRound(true);
      setConfetti(true);
      onClaimBingo();
      if (soundEnabled) setTimeout(() => playWin(), 200);
    }
  }, [card, wonRound, phase, onClaimBingo, soundEnabled, hasWon]);

  // Confetti for round/game winners
  useEffect(() => {
    if ((phase === 'round_end' || phase === 'game_over') && iWon) setConfetti(true);
    else if (phase === 'round_end' || phase === 'game_over') setConfetti(false);
  }, [phase, iWon]);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2800);
  };

  const handleCellCross = (row: number, col: number) => {
    resumeAudio();
    const num = card.numbers[row][col];
    if (!calledSet.has(num)) { showToast(`⚠️ ${num} hasn't been called yet!`); return; }
    setCard(prev => applyNumber(prev, num));
    if (soundEnabled) playMark();
  };

  const handleRefreshCard = () => {
    if (phase !== 'lobby') return;
    setCard(generateCard());
  };

  const copyCode = () => {
    navigator.clipboard.writeText(roomCode).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });
  };

  return (
    <div className="game-screen">
      <Confetti active={confetti} />
      {showQuit && <QuitModal onConfirm={onQuit} onCancel={() => setShowQuit(false)} />}
      {toast && <div className="toast">{toast}</div>}

      {/* ── Top bar ── */}
      <div className="top-bar">
        <div className="top-bar-left">
          <span className={`role-tag ${isHost ? 'host-tag' : 'peer-tag'}`}>
            {isHost ? '👑 Host' : '🎮 Player'}
          </span>
          <span className="player-name-tag">{playerName}</span>
        </div>
        <div className="top-bar-right">
          <div className="room-chip">
            <span className="rc-label">Room</span>
            <span className="rc-code">{roomCode}</span>
            {phase === 'lobby' && (
              <button className="btn btn-ghost btn-xs" onClick={copyCode}>{copied ? '✅' : '📋'}</button>
            )}
          </div>
          <button className="btn btn-ghost btn-sm" onClick={onToggleSound}>{soundEnabled ? '🔊' : '🔇'}</button>
          <button className="btn btn-ghost btn-sm danger-btn" onClick={() => setShowQuit(true)}>🚪 Quit</button>
        </div>
      </div>

      {/* ── Round bar ── */}
      {phase !== 'lobby' && phase !== 'game_over' && (
        <div className="round-bar">
          <span className="round-label">Round {round} of {gameState.totalRounds}</span>
          <div className="round-pips">
            {Array.from({ length: gameState.totalRounds }, (_, i) => (
              <div key={i} className={`pip ${i < round - 1 ? 'done' : i === round - 1 ? 'current' : ''}`} />
            ))}
          </div>
        </div>
      )}

      {/* ── LOBBY ── */}
      {phase === 'lobby' && (
        <div className="lobby-area">
          <div className="lobby-inner">
            <div className="lobby-icon">🎱</div>
            <h2>Room <span className="code-hl">{roomCode}</span></h2>
            <p>Share this code with friends to join!</p>
            <PlayerList players={players} myId={myId} />
            <div className="lobby-card-preview">
              <p className="preview-label">Your card — shuffle before we start!</p>
              <BingoCard
                card={card}
                lastCalledNumber={null}
                calledNumbers={new Set()}
                onCross={() => {}}
                disabled={true}
                showRefresh={true}
                onRefresh={handleRefreshCard}
              />
            </div>
            {isHost && (
              <div className="rounds-selector">
                <span className="rounds-label">Rounds</span>
                <div className="rounds-btns">
                  {[3, 5, 10, 15].map(n => (
                    <button
                      key={n}
                      className={`btn btn-ghost btn-sm ${totalRounds === n ? 'active' : ''}`}
                      onClick={() => onSetTotalRounds?.(n)}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {isHost ? (
              <button className="btn btn-primary btn-large" onClick={onStartGame} disabled={players.length < 1}>
                🚀 Start Game ({players.length} player{players.length !== 1 ? 's' : ''})
              </button>
            ) : (
              <p className="waiting-text">⏳ Waiting for host to start…</p>
            )}
          </div>
        </div>
      )}

      {/* ── PLAYING ── */}
      {phase === 'playing' && (
        <div className="game-body">
          <div className="left-panel">
            {/* Who's calling — prominent banner */}
            <div className={`caller-banner ${isMyTurn ? 'my-turn-banner' : ''}`}>
              {isMyTurn ? (
                <>
                  <span className="cb-emoji">🎯</span>
                  <span className="cb-text">Your turn to call!</span>
                </>
              ) : (
                <>
                  <span className="cb-emoji">🎲</span>
                  <span className="cb-text"><strong>{currentCallerName}</strong> is calling</span>
                </>
              )}
            </div>

            <PlayerList players={players} myId={myId} currentCallerId={currentCallerId} />

            {/* Last called number */}
            <div className="called-display">
              <p className="called-label">Last Called</p>
              {lastCalled
                ? <div className="last-num" key={lastCalled}>{lastCalled}</div>
                : <div className="last-num empty">—</div>
              }
              <p className="called-count">{calledNumbers.length}/25 called</p>
            </div>

            {/* Number picker */}
            <NumberPicker
              calledNumbers={calledSet}
              onPick={(n) => {
                // Optimistic update — apply locally immediately, don't wait for round-trip
                setCard(prev => applyNumber(prev, n));
                prevCalledRef.current = [n, ...prevCalledRef.current];
                onCallNumber(n);
              }}
              isMyTurn={isMyTurn}
              currentCallerName={currentCallerName}
            />
          </div>

          <div className="right-panel">
            <BingoCard
              card={card}
              lastCalledNumber={lastCalled}
              calledNumbers={calledSet}
              onCross={handleCellCross}
              disabled={wonRound}
            />
            {me && (
              <div className="my-score-badge">
                🏆 My Score: <strong>{me.score}</strong> pt
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── ROUND END ── */}
      {phase === 'round_end' && (
        <div className="phase-overlay">
          <div className="phase-card">
            <div className="phase-emoji">{iWon ? '🏆' : '😢'}</div>
            <h2>{iWon ? 'You Won the Round!' : `${roundWinnerName} Wins!`}</h2>
            <p className="phase-sub">Round {round - 1} complete</p>
            <div className="scores-list">
              {[...players].sort((a,b) => b.score - a.score).map((p, i) => (
                <div key={p.id} className={`score-row ${p.id === myId ? 'me' : ''}`}>
                  <span>{i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i+1}`}</span>
                  <span className="score-name">{p.name}{p.id === myId ? ' (you)' : ''}</span>
                  <span className="score-pts">{p.score}pt</span>
                </div>
              ))}
            </div>
            {isHost && round <= gameState.totalRounds ? (
              <button className="btn btn-primary btn-large" onClick={onNextRound}>
                ▶ Next Round ({round}/{gameState.totalRounds})
              </button>
            ) : !isHost ? (
              <p className="waiting-text">⏳ Waiting for host…</p>
            ) : null}
          </div>
        </div>
      )}

      {/* ── GAME OVER ── */}
      {phase === 'game_over' && (
        <div className="phase-overlay">
          <div className="phase-card">
            <div className="phase-emoji bounce">🎊</div>
            <h2 className="game-over-title">Game Over!</h2>
            <p className="phase-sub">Final Scoreboard — {gameState.totalRounds} Rounds</p>
            <div className="scores-list final">
              {[...players].sort((a,b) => b.score - a.score).map((p, i) => (
                <div key={p.id} className={`score-row final-row rank-${i+1} ${p.id === myId ? 'me' : ''}`}>
                  <span className="final-rank">{i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i+1}`}</span>
                  <span className="score-name">{p.name}{p.id === myId ? ' (you)' : ''}</span>
                  <span className="score-pts">{p.score}pt</span>
                </div>
              ))}
            </div>
            {isHost
              ? <button className="btn btn-primary btn-large" onClick={onResetGame}>🔄 Play Again</button>
              : <p className="waiting-text">⏳ Waiting for host to restart…</p>
            }
          </div>
        </div>
      )}
    </div>
  );
}
