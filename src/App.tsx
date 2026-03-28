import { useState, useEffect } from 'react';
import HostGame from './components/HostGame';
import PeerGame from './components/PeerGame';
import { playClick, resumeAudio } from './utils/sounds';
import './App.css';

type Screen = 'home' | 'host-confirm' | 'join-confirm' | 'hosting' | 'playing';

// ── Stats helpers ─────────────────────────────────────────────
interface AppStats {
  totalGames: number;
  totalPlayers: number;
  totalRoundsPlayed: number;
}

function loadStats(): AppStats {
  try {
    const raw = localStorage.getItem('bingo_stats');
    if (raw) return JSON.parse(raw);
  } catch {}
  return { totalGames: 0, totalPlayers: 0, totalRoundsPlayed: 0 };
}

function saveStats(s: AppStats) {
  try { localStorage.setItem('bingo_stats', JSON.stringify(s)); } catch {}
}

export function recordGamePlayed(numPlayers: number, numRounds: number) {
  const s = loadStats();
  s.totalGames += 1;
  s.totalPlayers += numPlayers;
  s.totalRoundsPlayed += numRounds;
  saveStats(s);
}

function getActiveRooms(): number {
  try {
    const raw = sessionStorage.getItem('bingo_active_rooms');
    return raw ? parseInt(raw, 10) : 0;
  } catch { return 0; }
}
function setActiveRooms(n: number) {
  try { sessionStorage.setItem('bingo_active_rooms', String(Math.max(0, n))); } catch {}
}

function formatNum(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}

export default function App() {
  const [screen, setScreen] = useState<Screen>('home');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [nameInput, setNameInput] = useState('');
  const [playerName, setPlayerName] = useState('');
  const [roomCodeInput, setRoomCodeInput] = useState('');
  const [activeRoomCode, setActiveRoomCode] = useState('');
  const [stats, setStats] = useState<AppStats>(loadStats);

  const isInGame = screen === 'hosting' || screen === 'playing';

  const refreshStats = () => setStats(loadStats());

  const click = () => { resumeAudio(); if (soundEnabled) playClick(); };

  const toggleSound = () => {
    resumeAudio();
    setSoundEnabled(s => { if (!s) playClick(); return !s; });
  };

  const goHome = () => {
    if (screen === 'hosting') setActiveRooms(getActiveRooms() - 1);
    setScreen('home');
    refreshStats();
  };

  const startHost = () => {
    const name = nameInput.trim() || 'Host';
    setPlayerName(name);
    setScreen('hosting');
    setActiveRooms(getActiveRooms() + 1);
    click();
  };

  const startJoin = () => {
    const name = nameInput.trim() || 'Player';
    const code = roomCodeInput.trim().toUpperCase();
    if (code.length !== 6) return;
    setPlayerName(name);
    setActiveRoomCode(code);
    setScreen('playing');
    click();
  };

  useEffect(() => {
    if (screen === 'home') refreshStats();
  }, [screen]);

  const activeRooms = getActiveRooms();

  return (
    <div className={`app${isInGame ? ' in-game' : ''}`} onClick={resumeAudio}>
      <div className="bg-blob blob-1" aria-hidden="true" />
      <div className="bg-blob blob-2" aria-hidden="true" />
      <div className="bg-blob blob-3" aria-hidden="true" />

      <header className="app-header">
        <h1 className="app-title" onClick={goHome} role="button" tabIndex={0}
          onKeyDown={e => e.key === 'Enter' && goHome()}
          aria-label="BINGO – go home">
          <span>B</span><span>I</span><span>N</span><span>G</span><span>O</span>
          <span className="title-bang">!</span>
        </h1>
        {screen === 'home' && (
          <p className="app-subtitle">Play online with your friends 🎉</p>
        )}
      </header>

      {/* ── HOME ──────────────────────────────────────────────── */}
      {screen === 'home' && (
        <main className="lobby">

          {/* Stats banner — only shown when there's data worth showing */}
          {(stats.totalGames > 0 || activeRooms > 0) && (
            <div className="stats-banner" role="region" aria-label="Game statistics">
              <div className="stat-item">
                <span className="stat-icon" aria-hidden="true">🎮</span>
                <span className="stat-value">{formatNum(stats.totalGames)}</span>
                <span className="stat-label">Games</span>
              </div>
              <div className="stat-divider" aria-hidden="true" />
              <div className="stat-item">
                <span className="stat-icon" aria-hidden="true">👥</span>
                <span className="stat-value">{formatNum(stats.totalPlayers)}</span>
                <span className="stat-label">Players</span>
              </div>
              <div className="stat-divider" aria-hidden="true" />
              <div className="stat-item">
                <span className="stat-icon" aria-hidden="true">🏆</span>
                <span className="stat-value">{formatNum(stats.totalRoundsPlayed)}</span>
                <span className="stat-label">Rounds</span>
              </div>
              {activeRooms > 0 && (
                <>
                  <div className="stat-divider" aria-hidden="true" />
                  <div className="stat-item">
                    <span className="stat-icon live-dot" aria-hidden="true">🟢</span>
                    <span className="stat-value">{activeRooms}</span>
                    <span className="stat-label">Live</span>
                  </div>
                </>
              )}
            </div>
          )}

          <div className="lobby-card">
            <div className="lobby-emoji" aria-hidden="true">🎱</div>
            <h2>Welcome!</h2>
            <p>Create a room and invite friends, or join with a code.</p>

            <div className="name-input-group">
              <label htmlFor="pname">Your name</label>
              <input
                id="pname"
                type="text"
                value={nameInput}
                onChange={e => setNameInput(e.target.value)}
                placeholder="Enter your name…"
                maxLength={20}
                autoComplete="nickname"
                autoCapitalize="words"
                onKeyDown={e => e.key === 'Enter' && setScreen('host-confirm')}
              />
            </div>

            <div className="home-actions">
              <button
                className="btn btn-primary btn-large"
                onClick={() => { click(); setScreen('host-confirm'); }}
              >
                👑 Create Room
              </button>
              <div className="or-divider" aria-hidden="true"><span>or</span></div>
              <button
                className="btn btn-teal btn-large"
                onClick={() => { click(); setScreen('join-confirm'); }}
              >
                🎮 Join Room
              </button>
            </div>

            <button className="btn btn-ghost sound-toggle" onClick={toggleSound}>
              {soundEnabled ? '🔊 Sound On' : '🔇 Sound Off'}
            </button>
          </div>
        </main>
      )}

      {/* ── HOST CONFIRM ──────────────────────────────────────── */}
      {screen === 'host-confirm' && (
        <main className="lobby">
          <div className="lobby-card">
            <div className="lobby-emoji" aria-hidden="true">👑</div>
            <h2>Create a Room</h2>
            <p>You'll host the game. A 6-letter code will be generated to share with friends.</p>
            <div className="name-input-group">
              <label htmlFor="host-name">Your name</label>
              <input
                id="host-name"
                type="text"
                value={nameInput}
                onChange={e => setNameInput(e.target.value)}
                placeholder="Enter your name…"
                maxLength={20}
                autoFocus
                autoComplete="nickname"
                autoCapitalize="words"
                onKeyDown={e => e.key === 'Enter' && startHost()}
              />
            </div>
            <div className="form-btns">
              <button className="btn btn-ghost" onClick={() => { click(); goHome(); }}>
                ← Back
              </button>
              <button className="btn btn-primary" onClick={startHost}>
                Create Room 🚀
              </button>
            </div>
          </div>
        </main>
      )}

      {/* ── JOIN CONFIRM ──────────────────────────────────────── */}
      {screen === 'join-confirm' && (
        <main className="lobby">
          <div className="lobby-card">
            <div className="lobby-emoji" aria-hidden="true">🎮</div>
            <h2>Join a Room</h2>
            <p>Enter the 6-letter code your friend shared with you.</p>
            <div className="name-input-group">
              <label htmlFor="join-name">Your name</label>
              <input
                id="join-name"
                type="text"
                value={nameInput}
                onChange={e => setNameInput(e.target.value)}
                placeholder="Enter your name…"
                maxLength={20}
                autoFocus
                autoComplete="nickname"
                autoCapitalize="words"
              />
            </div>
            <div className="name-input-group">
              <label htmlFor="room-code">Room Code</label>
              <input
                id="room-code"
                type="text"
                value={roomCodeInput}
                onChange={e =>
                  setRoomCodeInput(
                    e.target.value.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 6)
                  )
                }
                placeholder="ABCXYZ"
                maxLength={6}
                className="code-input"
                autoComplete="off"
                autoCapitalize="characters"
                inputMode="text"
                onKeyDown={e => e.key === 'Enter' && startJoin()}
              />
            </div>
            <div className="form-btns">
              <button className="btn btn-ghost" onClick={() => { click(); goHome(); }}>
                ← Back
              </button>
              <button
                className="btn btn-primary"
                onClick={startJoin}
                disabled={roomCodeInput.length !== 6}
              >
                Join 🎯
              </button>
            </div>
          </div>
        </main>
      )}

      {/* ── HOSTING ───────────────────────────────────────────── */}
      {screen === 'hosting' && (
        <HostGame
          hostName={playerName}
          soundEnabled={soundEnabled}
          onToggleSound={toggleSound}
          onQuit={goHome}
          onGameComplete={recordGamePlayed}
        />
      )}

      {/* ── PLAYING ───────────────────────────────────────────── */}
      {screen === 'playing' && (
        <PeerGame
          roomCode={activeRoomCode}
          playerName={playerName}
          soundEnabled={soundEnabled}
          onToggleSound={toggleSound}
          onQuit={goHome}
        />
      )}

      <footer className="app-footer">
        Built with ❤️ by <strong>HIRUSH GIMHAN</strong>
      </footer>
    </div>
  );
}
