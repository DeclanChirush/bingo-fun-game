import { useState, useRef } from 'react';
import { useHost } from '../hooks/useHost';
import GameScreen from './GameScreen';

interface Props {
  hostName: string;
  soundEnabled: boolean;
  onToggleSound: () => void;
  onQuit: () => void;
  onGameComplete?: (numPlayers: number, numRounds: number) => Promise<void>;
}

export default function HostGame({ hostName, soundEnabled, onToggleSound, onQuit, onGameComplete }: Props) {
  const [totalRounds, setTotalRounds] = useState(5);
  const { roomCode, peerReady, error, gameState, myId, actions } = useHost(hostName, soundEnabled, totalRounds);
  const recordedRef = useRef(false);

  // Record stats once when game ends
  if (gameState?.phase === 'game_over' && !recordedRef.current) {
    recordedRef.current = true;
    onGameComplete?.(gameState.players.length, gameState.totalRounds);
  }
  if (gameState?.phase === 'lobby' && recordedRef.current) {
    recordedRef.current = false;
  }

  if (error) {
    return (
      <div style={{ display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',minHeight:'50vh',gap:16,padding:24,textAlign:'center',position:'relative',zIndex:1 }}>
        <div style={{fontSize:'3rem'}}>❌</div>
        <h2 style={{fontFamily:"'Fredoka One',cursive",fontSize:'1.6rem'}}>Connection Error</h2>
        <p style={{color:'rgba(255,255,255,0.6)'}}>{error}</p>
        <button className="btn btn-primary" onClick={onQuit}>← Back</button>
      </div>
    );
  }

  if (!peerReady || !gameState) {
    return (
      <div style={{ display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',minHeight:'50vh',gap:12,position:'relative',zIndex:1 }}>
        <div style={{fontSize:'2.5rem',animation:'spin 1.5s linear infinite'}}>🔄</div>
        <p style={{fontFamily:"'Fredoka One',cursive",fontSize:'1.2rem',color:'rgba(255,255,255,0.7)'}}>Setting up room…</p>
        <style>{`@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style>
      </div>
    );
  }

  return (
    <GameScreen
      myId={myId}
      playerName={hostName}
      roomCode={roomCode}
      isHost={true}
      gameState={gameState}
      soundEnabled={soundEnabled}
      onToggleSound={onToggleSound}
      onQuit={onQuit}
      onCallNumber={actions.hostCallNumber}
      onClaimBingo={actions.hostClaimBingo}
      onStartGame={actions.startGame}
      onNextRound={actions.nextRound}
      onResetGame={actions.resetGame}
      totalRounds={totalRounds}
      onSetTotalRounds={setTotalRounds}
    />
  );
}
