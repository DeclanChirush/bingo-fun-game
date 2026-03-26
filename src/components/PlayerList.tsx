import type { PlayerInfo } from '../utils/multiplayerTypes';
import './PlayerList.css';

interface Props {
  players: PlayerInfo[];
  myId: string;
  currentCallerId?: string;
  winnerId?: string | null;
  showScores?: boolean;
}

export default function PlayerList({ players, myId, currentCallerId, winnerId, showScores }: Props) {
  const sorted = showScores
    ? [...players].sort((a, b) => b.score - a.score)
    : players;

  return (
    <div className="player-list">
      <h3 className="pl-title">👥 Players ({players.length})</h3>
      <ul className="pl-items">
        {sorted.map((p, i) => (
          <li key={p.id} className={[
            'pl-item',
            p.id === myId ? 'me' : '',
            p.id === currentCallerId ? 'calling' : '',
            p.id === winnerId ? 'round-winner' : '',
          ].filter(Boolean).join(' ')}>
            {showScores && (
              <span className={`pl-rank rank-${i + 1}`}>
                {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}
              </span>
            )}
            <span className="pl-avatar">{p.isHost ? '👑' : '🎮'}</span>
            <span className="pl-name">
              {p.name}
              {p.id === myId && <span className="pl-you"> (you)</span>}
            </span>
            {p.id === currentCallerId && <span className="calling-badge">🎯 Calling</span>}
            {p.id === winnerId && <span className="winner-badge">🏆 Won!</span>}
            {showScores && <span className="pl-score">{p.score}pt</span>}
          </li>
        ))}
      </ul>
    </div>
  );
}
