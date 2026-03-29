import { useCallback, useEffect, useRef, useState } from 'react';
import Peer, { DataConnection } from 'peerjs';
import type { GameState, HostMsg, PeerMsg } from '../utils/multiplayerTypes';
import { playDraw, playBingo, playWin, resumeAudio } from '../utils/sounds';

export function roomCodeToPeerId(code: string) {
  return `BINGOROOM2-${code}`;
}

const PEER_CONFIG = {
  host: '0.peerjs.com', port: 443, secure: true, path: '/',
  pingInterval: 5000,
  config: {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:global.stun.twilio.com:3478' },
    ],
    iceCandidatePoolSize: 10,
  },
};

// FIX #4: How long to wait before trying to reconnect after screen-off
const RECONNECT_DELAY = 1500;
const MAX_RECONNECT_ATTEMPTS = 5;

export type ConnStatus = 'connecting' | 'connected' | 'rejected' | 'disconnected' | 'reconnecting' | 'error';

export function usePeer(roomCode: string, playerName: string, soundEnabled: boolean) {
  const [status, setStatus] = useState<ConnStatus>('connecting');
  const [myId, setMyId] = useState('');
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [incomingReaction, setIncomingReaction] = useState<{ emoji: string; name: string; id: number } | null>(null);
  const reactionCounterRef = useRef(0);

  const claimedRef = useRef(false);
  const peerRef = useRef<Peer | null>(null);
  const connRef = useRef<DataConnection | null>(null);
  const soundRef = useRef(soundEnabled);
  const reconnectAttemptsRef = useRef(0);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isRejectedRef = useRef(false); // don't reconnect if explicitly rejected

  useEffect(() => { soundRef.current = soundEnabled; }, [soundEnabled]);

  // Stable send helper
  const send = useCallback((msg: PeerMsg) => {
    if (connRef.current?.open) connRef.current.send(msg);
  }, []);

  // ── Message handler ───────────────────────────────────────
  const hostMsgHandlerRef = useRef<(msg: HostMsg) => void>(() => {});

  hostMsgHandlerRef.current = (msg: HostMsg) => {
    switch (msg.type) {
      case 'PING':
        // Reply to host heartbeat immediately
        send({ type: 'PONG', payload: { ts: msg.payload.ts } });
        break;

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
          roundWinner: msg.payload.winnerId,
          players: prev.players.map(p => ({
            ...p,
            score: msg.payload.scores[p.id] ?? p.score,
          })),
        } : null);
        if (soundRef.current) {
          setTimeout(() => playWin(), 200);
          setTimeout(() => playBingo(), 700);
        }
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
        if (soundRef.current) {
          setTimeout(() => playWin(), 200);
          setTimeout(() => playBingo(), 700);
        }
        break;

      case 'GAME_RESET':
        claimedRef.current = false;
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
        isRejectedRef.current = true;
        setRejectReason(msg.payload.reason);
        setStatus('rejected');
        break;

      case 'EMOJI_REACT':
        setIncomingReaction({
          emoji: msg.payload.emoji,
          name: msg.payload.playerName,
          id: ++reactionCounterRef.current,
        });
        break;
    }
  };

  // ── Connect to host ───────────────────────────────────────
  const connectToHost = useCallback((peer: Peer) => {
    const hostPeerId = roomCodeToPeerId(roomCode.toUpperCase().trim());
    const conn = peer.connect(hostPeerId, { reliable: true, serialization: 'json' });
    connRef.current = conn;

    conn.on('open', () => {
      reconnectAttemptsRef.current = 0;
      setStatus('connected');
      conn.send({ type: 'JOIN_REQUEST', payload: { name: playerName } } as PeerMsg);
    });

    conn.on('data', data => hostMsgHandlerRef.current(data as HostMsg));

    conn.on('close', () => {
      if (isRejectedRef.current) return;
      // FIX #4: Auto-reconnect on disconnect
      if (reconnectAttemptsRef.current < MAX_RECONNECT_ATTEMPTS) {
        setStatus('reconnecting');
        reconnectAttemptsRef.current += 1;
        const delay = RECONNECT_DELAY * reconnectAttemptsRef.current;
        reconnectTimerRef.current = setTimeout(() => {
          if (!isRejectedRef.current) connectToHost(peer);
        }, delay);
      } else {
        setStatus('disconnected');
      }
    });

    conn.on('error', () => {
      if (isRejectedRef.current) return;
      if (reconnectAttemptsRef.current < MAX_RECONNECT_ATTEMPTS) {
        setStatus('reconnecting');
        reconnectAttemptsRef.current += 1;
        const delay = RECONNECT_DELAY * reconnectAttemptsRef.current;
        reconnectTimerRef.current = setTimeout(() => {
          if (!isRejectedRef.current) connectToHost(peer);
        }, delay);
      } else {
        setStatus('error');
      }
    });
  }, [roomCode, playerName]);

  // ── Page Visibility (FIX #4) ──────────────────────────────
  // When player's screen comes back on, ensure connection is alive.
  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        resumeAudio();
        // If connection dropped while screen was off, reconnect
        if (!connRef.current?.open && peerRef.current && !isRejectedRef.current) {
          if (reconnectAttemptsRef.current < MAX_RECONNECT_ATTEMPTS) {
            setStatus('reconnecting');
            reconnectAttemptsRef.current += 1;
            connectToHost(peerRef.current);
          }
        }
      }
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, [connectToHost]);

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

    peer.on('open', id => {
      setMyId(id);
      connectToHost(peer);
    });

    peer.on('error', err => {
      if (err.type === 'peer-unavailable') {
        if (reconnectAttemptsRef.current < MAX_RECONNECT_ATTEMPTS) {
          setStatus('reconnecting');
          reconnectAttemptsRef.current += 1;
          reconnectTimerRef.current = setTimeout(() => {
            if (!isRejectedRef.current) connectToHost(peer);
          }, RECONNECT_DELAY * reconnectAttemptsRef.current);
        } else {
          setRejectReason('Room not found. Check the code and try again.');
          setStatus('rejected');
        }
      } else {
        setStatus('error');
      }
    });

    return () => {
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
      peer.destroy();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sendEmojiReact = useCallback((emoji: string) => {
    const id = myId || peerRef.current?.id || '';
    send({ type: 'EMOJI_REACT', payload: { emoji, playerId: id, playerName } });
  }, [send, myId, playerName]);

  return { status, myId, gameState, rejectReason, incomingReaction, actions: { callNumber, claimBingo, sendEmojiReact } };
}
