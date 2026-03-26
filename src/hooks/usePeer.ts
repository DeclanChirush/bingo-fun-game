import { useCallback, useEffect, useRef, useState } from 'react';
import Peer, { DataConnection } from 'peerjs';
import type { GameState, HostMsg, PeerMsg } from '../utils/multiplayerTypes';
import { playDraw, playBingo, playWin, resumeAudio } from '../utils/sounds';

export function roomCodeToPeerId(code: string) {
  return `BINGOROOM2-${code}`;
}

const PEER_CONFIG = {
  host: '0.peerjs.com', port: 443, secure: true, path: '/',
  pingInterval: 8000,
  config: {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:global.stun.twilio.com:3478' },
    ],
    iceCandidatePoolSize: 10,
  },
};

export type ConnStatus = 'connecting' | 'connected' | 'rejected' | 'disconnected' | 'error';

export function usePeer(roomCode: string, playerName: string, soundEnabled: boolean) {
  const [status, setStatus] = useState<ConnStatus>('connecting');
  const [myId, setMyId] = useState('');
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const claimedRef = useRef(false);
  const peerRef = useRef<Peer | null>(null);
  const connRef = useRef<DataConnection | null>(null);
  const soundRef = useRef(soundEnabled);
  useEffect(() => { soundRef.current = soundEnabled; }, [soundEnabled]);

  const handleHostMsg = useCallback((msg: HostMsg) => {
    switch (msg.type) {
      case 'FULL_STATE':
        setGameState(msg.payload);
        break;
      case 'PLAYER_LIST':
        setGameState(prev => prev ? { ...prev, players: msg.payload.players } : null);
        break;
      case 'ROUND_STARTED':
        claimedRef.current = false;
        setGameState(prev => prev ? {
          ...prev,
          phase: 'playing',
          round: msg.payload.round,
          callerOrder: msg.payload.callerOrder,
          callerIndex: 0,
          calledNumbers: [],
          shuffledPool: msg.payload.shuffledPool,
          roundWinner: null,
          locked: true,
        } : null);
        break;
      case 'NUMBER_CALLED':
        setGameState(prev => prev ? {
          ...prev,
          calledNumbers: msg.payload.calledNumbers,
          callerIndex: msg.payload.nextCallerIndex,
        } : null);
        if (soundRef.current) playDraw();
        break;
      case 'ROUND_WON':
        setGameState(prev => prev ? {
          ...prev,
          phase: 'round_end',
          // BUG FIX: round stays the same (host no longer increments it in ROUND_WON)
          roundWinner: msg.payload.winnerId,
          players: prev.players.map(p => ({
            ...p,
            score: msg.payload.scores[p.id] ?? p.score,
          })),
        } : null);
        if (soundRef.current) { setTimeout(() => playWin(), 200); setTimeout(() => playBingo(), 700); }
        break;
      case 'GAME_OVER':
        setGameState(prev => prev ? {
          ...prev,
          phase: 'game_over',
          players: prev.players.map(p => ({
            ...p,
            score: msg.payload.scores[p.id] ?? p.score,
          })),
        } : null);
        if (soundRef.current) { setTimeout(() => playWin(), 200); setTimeout(() => playBingo(), 700); }
        break;
      case 'GAME_RESET':
        setGameState(prev => prev ? {
          ...prev,
          phase: 'lobby',
          round: 1,
          calledNumbers: [],
          shuffledPool: [],
          roundWinner: null,
          callerIndex: 0,
          callerOrder: [],
          locked: false,
          players: prev.players.map(p => ({ ...p, score: 0 })),
        } : null);
        break;
      case 'JOIN_REJECTED':
        setRejectReason(msg.payload.reason);
        setStatus('rejected');
        break;
    }
  }, []);

  const send = useCallback((msg: PeerMsg) => {
    if (connRef.current?.open) connRef.current.send(msg);
  }, []);

  const callNumber = useCallback((num: number) => {
    resumeAudio();
    send({ type: 'CALL_NUMBER', payload: { number: num, callerId: peerRef.current?.id ?? '' } });
  }, [send]);

  const claimBingo = useCallback(() => {
    if (claimedRef.current) return;
    claimedRef.current = true;
    resumeAudio();
    send({ type: 'CLAIM_BINGO', payload: { playerId: peerRef.current?.id ?? '', playerName } });
  }, [send, playerName]);

  useEffect(() => {
    const peer = new Peer(PEER_CONFIG);
    peerRef.current = peer;

    peer.on('open', (id) => {
      setMyId(id);
      const hostPeerId = roomCodeToPeerId(roomCode.toUpperCase().trim());
      const conn = peer.connect(hostPeerId, { reliable: true, serialization: 'json' });
      connRef.current = conn;

      conn.on('open', () => {
        setStatus('connected');
        conn.send({ type: 'JOIN_REQUEST', payload: { name: playerName } } as PeerMsg);
      });
      conn.on('data', data => handleHostMsg(data as HostMsg));
      conn.on('close', () => setStatus('disconnected'));
      conn.on('error', () => setStatus('error'));
    });

    peer.on('error', (err) => {
      const msg = err.type === 'peer-unavailable' ? 'rejected' : 'error';
      if (msg === 'rejected') setRejectReason('Room not found. Check the code.');
      setStatus(msg as ConnStatus);
    });

    return () => peer.destroy();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { status, myId, gameState, rejectReason, actions: { callNumber, claimBingo } };
}
