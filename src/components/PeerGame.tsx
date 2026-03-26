import { usePeer } from '../hooks/usePeer';
import GameScreen from './GameScreen';

interface Props {
  roomCode: string;
  playerName: string;
  soundEnabled: boolean;
  onToggleSound: () => void;
  onQuit: () => void;
}

export default function PeerGame({ roomCode, playerName, soundEnabled, onToggleSound, onQuit }: Props) {
  const { status, myId, gameState, rejectReason, actions } = usePeer(roomCode, playerName, soundEnabled);

  if (status === 'connecting') {
    return (
      <div style={{ display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',minHeight:'50vh',gap:12,position:'relative',zIndex:1 }}>
        <div style={{fontSize:'2.5rem',animation:'spin 1.5s linear infinite'}}>🔄</div>
        <p style={{fontFamily:"'Fredoka One',cursive",fontSize:'1.2rem',color:'rgba(255,255,255,0.7)'}}>Joining room <strong>{roomCode}</strong>…</p>
        <style>{`@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style>
      </div>
    );
  }

  if (status === 'rejected' || status === 'error' || status === 'disconnected') {
    const msg = status === 'rejected' ? rejectReason
      : status === 'disconnected' ? 'Disconnected from the host.'
      : 'Could not connect to room. Check the code and try again.';
    return (
      <div style={{ display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',minHeight:'50vh',gap:16,padding:24,textAlign:'center',position:'relative',zIndex:1 }}>
        <div style={{fontSize:'3rem'}}>{status === 'rejected' ? '🔒' : '❌'}</div>
        <h2 style={{fontFamily:"'Fredoka One',cursive",fontSize:'1.6rem'}}>
          {status === 'rejected' ? 'Room Locked' : 'Connection Failed'}
        </h2>
        <p style={{color:'rgba(255,255,255,0.6)',maxWidth:320}}>{msg}</p>
        <button className="btn btn-primary" onClick={onQuit}>← Back</button>
      </div>
    );
  }

  if (!gameState) {
    return (
      <div style={{ display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',minHeight:'50vh',gap:12,position:'relative',zIndex:1 }}>
        <div style={{fontSize:'2.5rem',animation:'spin 1.5s linear infinite'}}>🔄</div>
        <p style={{fontFamily:"'Fredoka One',cursive",fontSize:'1.2rem',color:'rgba(255,255,255,0.7)'}}>Connected! Loading game state…</p>
        <style>{`@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style>
      </div>
    );
  }

  return (
    <GameScreen
      myId={myId}
      playerName={playerName}
      roomCode={roomCode}
      isHost={false}
      gameState={gameState}
      soundEnabled={soundEnabled}
      onToggleSound={onToggleSound}
      onQuit={onQuit}
      onCallNumber={actions.callNumber}
      onClaimBingo={actions.claimBingo}
    />
  );
}
