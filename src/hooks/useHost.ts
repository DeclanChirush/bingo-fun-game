import { useCallback, useEffect, useRef, useState } from 'react';
import Peer, { DataConnection } from 'peerjs';
import type { GameState, PlayerInfo, HostMsg, PeerMsg } from '../utils/multiplayerTypes';
import { generatePool, buildCallerOrder } from '../utils/gameLogic';
import { playDraw, playBingo, playWin, resumeAudio } from '../utils/sounds';

function makeRoomCode(): string {
  return Array.from({ length: 6 }, () =>
    'ABCDEFGHJKLMNPQRSTUVWXYZ'[Math.floor(Math.random() * 23)]
  ).join('');
}

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

const initGameState = (hostId: string, hostName: string, totalRounds: number): GameState => ({
  phase: 'lobby',
  round: 1,
  players: [{ id: hostId, name: hostName, isHost: true, score: 0 }],
  callerOrder: [],
  callerIndex: 0,
  calledNumbers: [],
  shuffledPool: [],
  roundWinner: null,
  locked: false,
  totalRounds
});

export function useHost(hostName: string, soundEnabled: boolean, totalRounds: number) {
  const [roomCode, setRoomCode] = useState('');
  const [peerReady, setPeerReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [gameState, setGameState] = useState<GameState | null>(null);

  const claimProcessedRef = useRef(false);
  const peerRef = useRef<Peer | null>(null);
  const connsRef = useRef<Map<string, DataConnection>>(new Map());
  const gsRef = useRef<GameState | null>(null);

  const soundRef = useRef(soundEnabled);
  useEffect(() => { soundRef.current = soundEnabled; }, [soundEnabled]);

  const totalRoundsRef = useRef(totalRounds);
  useEffect(() => { totalRoundsRef.current = totalRounds; }, [totalRounds]);

  const updateGS = useCallback((updater: (prev: GameState) => GameState) => {
    setGameState(prev => {
      const next = updater(prev!);
      gsRef.current = next;
      return next;
    });
  }, []);

  const broadcast = useCallback((msg: HostMsg) => {
    connsRef.current.forEach(conn => { if (conn.open) conn.send(msg); });
  }, []);

  // ── Start round ─────────────────────────────────────────────
  const startRound = useCallback((gs: GameState) => {
    claimProcessedRef.current = false;
    const pool = generatePool();
    const playerIds = gs.players.map(p => p.id);
    const callerOrder = buildCallerOrder(playerIds, gs.round);

    const next: GameState = {
      ...gs,
      phase: 'playing',
      callerOrder,
      callerIndex: 0,
      calledNumbers: [],
      shuffledPool: pool,
      roundWinner: null,
      locked: true,
    };
    gsRef.current = next;
    setGameState(next);
    broadcast({ type: 'ROUND_STARTED', payload: { round: next.round, callerOrder, shuffledPool: pool } });
  }, [broadcast]);

  // ── Call a number (host or relayed from peer) ────────────────
  // const callNumber = useCallback((num: number) => {
  //   const gs = gsRef.current;
  //   if (!gs || gs.phase !== 'playing') return;
  //   const caller = gs.callerOrder[gs.callerIndex];
  //   const hostId = peerRef.current?.id ?? '';
  //   // Only the current caller can call (host enforces)
  //   if (caller !== hostId && caller !== num.toString()) {
  //     // relayed call is already validated by caller check upstream
  //   }

  //   const calledNumbers = [num, ...gs.calledNumbers];
  //   const nextCallerIndex = (gs.callerIndex + 1) % gs.callerOrder.length;

  //   updateGS(prev => ({ ...prev!, calledNumbers, callerIndex: nextCallerIndex }));
  //   broadcast({ type: 'NUMBER_CALLED', payload: { number: num, calledNumbers, nextCallerIndex } });
  //   if (soundRef.current) playDraw();
  // }, [broadcast, updateGS]);

  const callNumber = useCallback((num: number) => {
    const gs = gsRef.current;
    if (!gs || gs.phase !== 'playing') return;

    const calledNumbers = [num, ...gs.calledNumbers];
    const nextCallerIndex = (gs.callerIndex + 1) % gs.callerOrder.length;

    // Broadcast FIRST before local state update — peers get it sooner
    broadcast({
      type: 'NUMBER_CALLED',
      payload: { number: num, calledNumbers, nextCallerIndex },
    });

    // Then update local state
    updateGS(prev => ({ ...prev!, calledNumbers, callerIndex: nextCallerIndex }));

    if (soundRef.current) playDraw();
  }, [broadcast, updateGS]);

  // ── Claim BINGO ──────────────────────────────────────────────
  const processBingoClaim = useCallback((playerId: string, playerName: string) => {
    if (claimProcessedRef.current) return;
    const gs = gsRef.current;
    if (!gs || gs.phase !== 'playing' || gs.roundWinner) return;
    claimProcessedRef.current = true;

    const scores: Record<string, number> = {};
    gs.players.forEach(p => { scores[p.id] = p.score + (p.id === playerId ? 1 : 0); });

    const nextRound = gs.round + 1;
    const isGameOver = nextRound > gs.totalRounds;

    const next: GameState = {
      ...gs,
      phase: isGameOver ? 'game_over' : 'round_end',
      round: isGameOver ? gs.round : nextRound,
      roundWinner: playerId,
      players: gs.players.map(p => ({ ...p, score: p.id === playerId ? p.score + 1 : p.score })),
    };
    gsRef.current = next;
    setGameState(next);

    broadcast({ type: 'ROUND_WON', payload: { winnerId: playerId, winnerName: playerName, scores } });
    if (isGameOver) {
      broadcast({ type: 'GAME_OVER', payload: { scores } });
    }
    if (soundRef.current) { setTimeout(() => playWin(), 200); setTimeout(() => playBingo(), 700); }
  }, [broadcast]);

  // ── Handle peer messages ─────────────────────────────────────
  const handlePeerMsg = useCallback((conn: DataConnection, msg: PeerMsg) => {
    if (msg.type === 'JOIN_REQUEST') {
      const gs = gsRef.current;
      if (gs?.locked || (gs?.phase !== 'lobby' && gs?.phase !== undefined)) {
        conn.send({ type: 'JOIN_REJECTED', payload: { reason: 'Game already started. Please wait for the next game.' } } as HostMsg);
        return;
      }
      const newPlayer: PlayerInfo = { id: conn.peer, name: msg.payload.name, isHost: false, score: 0 };
      updateGS(prev => {
        const players = [...prev!.players.filter(p => p.id !== conn.peer), newPlayer];
        const next = { ...prev!, players };
        conn.send({ type: 'FULL_STATE', payload: next } as HostMsg);
        setTimeout(() => broadcast({ type: 'PLAYER_LIST', payload: { players } }), 50);
        return next;
      });
    }

    if (msg.type === 'CALL_NUMBER') {
      const gs = gsRef.current;
      if (!gs || gs.phase !== 'playing') return;
      const currentCaller = gs.callerOrder[gs.callerIndex];
      if (currentCaller !== msg.payload.callerId) return; // not their turn
      if (gs.calledNumbers.includes(msg.payload.number)) return; // already called
      callNumber(msg.payload.number);
    }

    if (msg.type === 'CLAIM_BINGO') {
      processBingoClaim(msg.payload.playerId, msg.payload.playerName);
    }
  }, [broadcast, callNumber, processBingoClaim, updateGS]);

  // ── Host actions ─────────────────────────────────────────────
  const hostCallNumber = useCallback((num: number) => {
    resumeAudio();
    const gs = gsRef.current;
    if (!gs || gs.phase !== 'playing') return;
    const hostId = peerRef.current?.id ?? '';
    const currentCaller = gs.callerOrder[gs.callerIndex];
    if (currentCaller !== hostId) return;
    callNumber(num);
  }, [callNumber]);

  const hostClaimBingo = useCallback(() => {
    const hostId = peerRef.current?.id ?? '';
    const resolvedName = gsRef.current?.players.find(p => p.id === hostId)?.name ?? hostName;
    processBingoClaim(hostId, resolvedName);
  }, [processBingoClaim, hostName]);

  const startGame = useCallback(() => {
    const gs = gsRef.current;
    if (!gs) return;
    startRound(gs);
  }, [startRound]);

  const nextRound = useCallback(() => {
    const gs = gsRef.current;
    if (!gs || gs.phase !== 'round_end') return;
    startRound(gs);
  }, [startRound]);

  const resetGame = useCallback(() => {
    const gs = gsRef.current;
    if (!gs) return;
    const hostId = peerRef.current?.id ?? '';
    const reset: GameState = {
      ...initGameState(hostId, gs.players.find(p => p.isHost)?.name ?? hostName, gs.totalRounds),
      players: gs.players.map(p => ({ ...p, score: 0 })),
      locked: false,
    };
    gsRef.current = reset;
    setGameState(reset);
    broadcast({ type: 'GAME_RESET', payload: {} });
  }, [broadcast, hostName]);

  // ── Init Peer ────────────────────────────────────────────────
  useEffect(() => {
    const code = makeRoomCode();
    const peer = new Peer(roomCodeToPeerId(code), PEER_CONFIG);
    peerRef.current = peer;

    peer.on('open', (id) => {
      const gs = initGameState(id, hostName, totalRoundsRef.current);
      gsRef.current = gs;
      setGameState(gs);
      setRoomCode(code);
      setPeerReady(true);
    });

    peer.on('error', err => setError(`Connection error: ${err.type}`));

    peer.on('connection', conn => {
      conn.on('open', () => connsRef.current.set(conn.peer, conn));
      conn.on('data', data => handlePeerMsg(conn, data as PeerMsg));
      conn.on('close', () => {
        connsRef.current.delete(conn.peer);
        updateGS(prev => {
          const players = prev!.players.filter(p => p.id !== conn.peer);
          const next = { ...prev!, players };
          broadcast({ type: 'PLAYER_LIST', payload: { players } });
          return next;
        });
      });
    });

    return () => peer.destroy();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    roomCode, peerReady, error, gameState,
    myId: peerRef.current?.id ?? '',
    actions: { startGame, nextRound, resetGame, hostCallNumber, hostClaimBingo },
  };
}
