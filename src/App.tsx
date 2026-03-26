import { useState } from 'react';
import HostGame from './components/HostGame';
import PeerGame from './components/PeerGame';
import { playClick, resumeAudio } from './utils/sounds';
import './App.css';

type Screen = 'home' | 'host-confirm' | 'join-confirm' | 'hosting' | 'playing';

export default function App() {
  const [screen, setScreen] = useState<Screen>('home');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [nameInput, setNameInput] = useState('');
  const [playerName, setPlayerName] = useState('');
  const [roomCodeInput, setRoomCodeInput] = useState('');
  const [activeRoomCode, setActiveRoomCode] = useState('');

  const click = () => { resumeAudio(); if (soundEnabled) playClick(); };

  const toggleSound = () => {
    resumeAudio();
    setSoundEnabled(s => { if (!s) playClick(); return !s; });
  };

  const goHome = () => setScreen('home');

  const startHost = () => {
    const name = nameInput.trim() || 'Host';
    setPlayerName(name);
    setScreen('hosting');
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

  return (
    <div className="app" onClick={resumeAudio}>
      <div className="bg-blob blob-1" />
      <div className="bg-blob blob-2" />
      <div className="bg-blob blob-3" />

      <header className="app-header">
        <h1 className="app-title" onClick={goHome}>
          <span>B</span><span>I</span><span>N</span><span>G</span><span>O</span>
          <span className="title-bang">!</span>
        </h1>
        {screen === 'home' && <p className="app-subtitle">Play online with your friends 🎉</p>}
      </header>

      {/* HOME */}
      {screen === 'home' && (
        <main className="lobby">
          <div className="lobby-card">
            <div className="lobby-emoji">🎱</div>
            <h2>Welcome!</h2>
            <p>Create a room and invite friends, or join an existing game with a code.</p>

            <div className="name-input-group">
              <label htmlFor="pname">Your name</label>
              <input id="pname" type="text" value={nameInput}
                onChange={e => setNameInput(e.target.value)}
                placeholder="Enter your name…" maxLength={20}
                onKeyDown={e => e.key === 'Enter' && setScreen('host-confirm')}
              />
            </div>

            <div className="home-actions">
              <button className="btn btn-primary btn-large" onClick={() => { click(); setScreen('host-confirm'); }}>
                👑 Create Room
              </button>
              <div className="or-divider"><span>or</span></div>
              <button className="btn btn-teal btn-large" onClick={() => { click(); setScreen('join-confirm'); }}>
                🎮 Join Room
              </button>
            </div>

            <button className="btn btn-ghost sound-toggle" onClick={toggleSound}>
              {soundEnabled ? '🔊 Sound On' : '🔇 Sound Off'}
            </button>
          </div>
        </main>
      )}

      {/* HOST CONFIRM */}
      {screen === 'host-confirm' && (
        <main className="lobby">
          <div className="lobby-card">
            <div className="lobby-emoji">👑</div>
            <h2>Create a Room</h2>
            <p>You'll host the game and control the rounds. A 6-letter code will be generated to share.</p>
            <div className="name-input-group">
              <label>Your name</label>
              <input type="text" value={nameInput}
                onChange={e => setNameInput(e.target.value)}
                placeholder="Enter your name…" maxLength={20}
                onKeyDown={e => e.key === 'Enter' && startHost()}
              />
            </div>
            <div className="form-btns">
              <button className="btn btn-ghost" onClick={() => { click(); goHome(); }}>← Back</button>
              <button className="btn btn-primary" onClick={startHost}>Create Room 🚀</button>
            </div>
          </div>
        </main>
      )}

      {/* JOIN CONFIRM */}
      {screen === 'join-confirm' && (
        <main className="lobby">
          <div className="lobby-card">
            <div className="lobby-emoji">🎮</div>
            <h2>Join a Room</h2>
            <p>Enter the 6-letter room code your friend shared with you.</p>
            <div className="name-input-group">
              <label>Your name</label>
              <input type="text" value={nameInput}
                onChange={e => setNameInput(e.target.value)}
                placeholder="Enter your name…" maxLength={20}
              />
            </div>
            <div className="name-input-group">
              <label>Room Code</label>
              <input type="text" value={roomCodeInput}
                onChange={e => setRoomCodeInput(e.target.value.toUpperCase().replace(/[^A-Z]/g,'').slice(0,6))}
                placeholder="e.g. ABCXYZ" maxLength={6} className="code-input"
                onKeyDown={e => e.key === 'Enter' && startJoin()}
              />
            </div>
            <div className="form-btns">
              <button className="btn btn-ghost" onClick={() => { click(); goHome(); }}>← Back</button>
              <button className="btn btn-primary" onClick={startJoin} disabled={roomCodeInput.length !== 6}>
                Join 🎯
              </button>
            </div>
          </div>
        </main>
      )}

      {/* HOSTING */}
      {screen === 'hosting' && (
        <HostGame
          hostName={playerName}
          soundEnabled={soundEnabled}
          onToggleSound={toggleSound}
          onQuit={goHome}
        />
      )}

      {/* PLAYING */}
      {screen === 'playing' && (
        <PeerGame
          roomCode={activeRoomCode}
          playerName={playerName}
          soundEnabled={soundEnabled}
          onToggleSound={toggleSound}
          onQuit={goHome}
        />
      )}

      {/* Footer credit */}
      <footer className="app-footer">
        Built with ❤️ by <strong>HIRUSH GIMHAN</strong>
      </footer>
    </div>
  );
}
