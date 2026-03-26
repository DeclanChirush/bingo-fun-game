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

function initGameState(hostId: string, hostName: string, totalRounds: number): GameState {
  return {
    phase: 'lobby',
    round: 1,
    players: [{ id: hostId, name: hostName, isHost: true, score: 0 }],
    callerOrder: [],
    callerIndex: 0,
    calledNumbers: [],
    shuffledPool: [],
    roundWinner: null,
    locked: false,
    totalRounds,
  };
}

export function useHost(hostName: string, soundEnabled: boolean, totalRounds: number) {
  const [roomCode, setRoomCode] = useState('');
  const [peerReady, setPeerReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [gameState, setGameState] = useState<GameState | null>(null);

  const peerRef = useRef<Peer | null>(null);
  const connsRef = useRef<Map<string, DataConnection>>(new Map());

  // Single source of truth for game state — always in sync
  const gsRef = useRef<GameState | null>(null);

  // Guards
  const claimProcessedRef = useRef(false);
  const nextRoundLockedRef = useRef(false);

  const soundRef = useRef(soundEnabled);
  useEffect(() => { soundRef.current = soundEnabled; }, [soundEnabled]);

  const totalRoundsRef = useRef(totalRounds);
  useEffect(() => { totalRoundsRef.current = totalRounds; }, [totalRounds]);

  // ── Helpers ──────────────────────────────────────────────────
  // Commit a new game state to both ref and React state
  const commitGS = (next: GameState) => {
    gsRef.current = next;
    setGameState(next);
  };

  const broadcast = useCallback((msg: HostMsg) => {
    connsRef.current.forEach(conn => { if (conn.open) conn.send(msg); });
  }, []);

  // sendTo a single connection (used for JOIN responses)
  const sendTo = (conn: DataConnection, msg: HostMsg) => {
    if (conn.open) conn.send(msg);
  };

  // ── Start round ──────────────────────────────────────────────
  const startRound = useCallback((gs: GameState) => {
    claimProcessedRef.current = false;
    nextRoundLockedRef.current = false;

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

    commitGS(next);
    broadcast({
      type: 'ROUND_STARTED',
      payload: { round: next.round, callerOrder, shuffledPool: pool },
    });
  }, [broadcast]);

  // ── Call a number ────────────────────────────────────────────
  const callNumber = useCallback((num: number) => {
    const gs = gsRef.current;
    if (!gs || gs.phase !== 'playing') return;
    if (gs.calledNumbers.includes(num)) return;

    const calledNumbers = [num, ...gs.calledNumbers];
    const nextCallerIndex = (gs.callerIndex + 1) % gs.callerOrder.length;

    const next: GameState = { ...gs, calledNumbers, callerIndex: nextCallerIndex };
    commitGS(next);

    broadcast({
      type: 'NUMBER_CALLED',
      payload: { number: num, calledNumbers, nextCallerIndex },
    });

    if (soundRef.current) playDraw();
  }, [broadcast]);

  // ── Claim BINGO ──────────────────────────────────────────────
  // Tie-break rule:
  //   1. If the caller themselves has bingo → they win.
  //   2. Otherwise the first claimer in *remaining* caller-turn order wins.
  //      (i.e. whoever is next in line to call after the current caller.)
  const pendingClaimsRef = useRef<{ id: string; name: string }[]>([]);
  const claimTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const resolveClaims = useCallback(() => {
    const gs = gsRef.current;
    if (!gs || gs.phase !== 'playing' || gs.roundWinner) return;
    if (claimProcessedRef.current) return;
    claimProcessedRef.current = true;

    const claims = pendingClaimsRef.current;
    pendingClaimsRef.current = [];

    if (claims.length === 0) return;

    // Determine winner by caller-order priority:
    // current caller first, then next in rotation
    const { callerOrder, callerIndex } = gs;
    let winner = claims[0]; // fallback: first to claim

    for (let offset = 0; offset < callerOrder.length; offset++) {
      const idx = (callerIndex + offset) % callerOrder.length;
      const candidate = callerOrder[idx];
      const match = claims.find(c => c.id === candidate);
      if (match) { winner = match; break; }
    }

    const isGameOver = gs.round >= gs.totalRounds;
    const scores: Record<string, number> = {};
    gs.players.forEach(p => {
      scores[p.id] = p.score + (p.id === winner.id ? 1 : 0);
    });

    const next: GameState = {
      ...gs,
      phase: isGameOver ? 'game_over' : 'round_end',
      roundWinner: winner.id,
      players: gs.players.map(p => ({
        ...p,
        score: p.id === winner.id ? p.score + 1 : p.score,
      })),
    };
    commitGS(next);

    broadcast({
      type: 'ROUND_WON',
      payload: { winnerId: winner.id, winnerName: winner.name, scores },
    });
    if (isGameOver) {
      broadcast({ type: 'GAME_OVER', payload: { scores } });
    }
    if (soundRef.current) {
      setTimeout(() => playWin(), 200);
      setTimeout(() => playBingo(), 700);
    }
  }, [broadcast]);

  const queueBingoClaim = useCallback((playerId: string, playerName: string) => {
    const gs = gsRef.current;
    if (!gs || gs.phase !== 'playing' || gs.roundWinner) return;
    if (claimProcessedRef.current) return;

    // Avoid duplicate claims from the same player
    if (pendingClaimsRef.current.some(c => c.id === playerId)) return;
    pendingClaimsRef.current.push({ id: playerId, name: playerName });

    // Wait a short window to collect simultaneous claims, then resolve
    if (claimTimerRef.current) clearTimeout(claimTimerRef.current);
    claimTimerRef.current = setTimeout(() => {
      resolveClaims();
    }, 150);
  }, [resolveClaims]);

  // ── Connection message handler (via ref — never stale) ───────
  // IMPORTANT: We define this as a plain ref-assigned function (NOT useCallback)
  // so the conn.on('data') listener, registered once on connect, always calls
  // the absolute latest version. This is the root cause of the original "stuck
  // after round" bug — stale useCallback closures captured old state.
  const msgHandlerRef = useRef<(conn: DataConnection, msg: PeerMsg) => void>(() => {});

  // Re-assign on every render (cheap, not a hook)
  msgHandlerRef.current = (conn: DataConnection, msg: PeerMsg) => {
    if (msg.type === 'JOIN_REQUEST') {
      const gs = gsRef.current;
      if (gs?.locked) {
        sendTo(conn, {
          type: 'JOIN_REJECTED',
          payload: { reason: 'Game already started. Please wait for the next game.' },
        });
        return;
      }
      const newPlayer: PlayerInfo = {
        id: conn.peer,
        name: msg.payload.name,
        isHost: false,
        score: 0,
      };
      const players = [
        ...(gsRef.current?.players ?? []).filter(p => p.id !== conn.peer),
        newPlayer,
      ];
      const next: GameState = { ...gsRef.current!, players };
      commitGS(next);
      sendTo(conn, { type: 'FULL_STATE', payload: next });
      setTimeout(() => broadcast({ type: 'PLAYER_LIST', payload: { players } }), 50);
    }

    if (msg.type === 'CALL_NUMBER') {
      const gs = gsRef.current;
      if (!gs || gs.phase !== 'playing') return;
      const currentCaller = gs.callerOrder[gs.callerIndex];
      if (currentCaller !== msg.payload.callerId) return;
      if (gs.calledNumbers.includes(msg.payload.number)) return;
      callNumber(msg.payload.number);
    }

    if (msg.type === 'CLAIM_BINGO') {
      queueBingoClaim(msg.payload.playerId, msg.payload.playerName);
    }
  };

  // ── Host-side actions ────────────────────────────────────────
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
    const gs = gsRef.current;
    const resolvedName = gs?.players.find(p => p.id === hostId)?.name ?? hostName;
    queueBingoClaim(hostId, resolvedName);
  }, [queueBingoClaim, hostName]);

  const startGame = useCallback(() => {
    const gs = gsRef.current;
    if (!gs) return;
    startRound(gs);
  }, [startRound]);

  const nextRound = useCallback(() => {
    if (nextRoundLockedRef.current) return;
    const gs = gsRef.current;
    if (!gs || gs.phase !== 'round_end') return;
    nextRoundLockedRef.current = true;

    // Increment round then start
    const nextGs: GameState = { ...gs, round: gs.round + 1 };
    commitGS(nextGs);
    // Small delay so React flushes before we broadcast ROUND_STARTED
    setTimeout(() => startRound(nextGs), 50);
  }, [startRound]);

  const resetGame = useCallback(() => {
    const gs = gsRef.current;
    if (!gs) return;
    const hostId = peerRef.current?.id ?? '';
    const reset: GameState = {
      ...initGameState(
        hostId,
        gs.players.find(p => p.isHost)?.name ?? hostName,
        gs.totalRounds,
      ),
      players: gs.players.map(p => ({ ...p, score: 0 })),
      locked: false,
    };
    commitGS(reset);
    broadcast({ type: 'GAME_RESET', payload: {} });
  }, [broadcast, hostName]);

  // ── Init Peer ────────────────────────────────────────────────
  useEffect(() => {
    const code = makeRoomCode();
    const peer = new Peer(roomCodeToPeerId(code), PEER_CONFIG);
    peerRef.current = peer;

    peer.on('open', id => {
      const gs = initGameState(id, hostName, totalRoundsRef.current);
      commitGS(gs);
      setRoomCode(code);
      setPeerReady(true);
    });

    peer.on('error', err => setError(`Connection error: ${err.type}`));

    peer.on('connection', conn => {
      conn.on('open', () => connsRef.current.set(conn.peer, conn));

      // Route through ref — always calls the latest msgHandlerRef.current
      // This avoids stale closures on callNumber / queueBingoClaim
      conn.on('data', data => msgHandlerRef.current(conn, data as PeerMsg));

      conn.on('close', () => {
        connsRef.current.delete(conn.peer);
        const gs = gsRef.current;
        if (!gs) return;
        const players = gs.players.filter(p => p.id !== conn.peer);
        const next = { ...gs, players };
        commitGS(next);
        broadcast({ type: 'PLAYER_LIST', payload: { players } });
      });
    });

    return () => {
      if (claimTimerRef.current) clearTimeout(claimTimerRef.current);
      peer.destroy();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    roomCode,
    peerReady,
    error,
    gameState,
    myId: peerRef.current?.id ?? '',
    actions: { startGame, nextRound, resetGame, hostCallNumber, hostClaimBingo },
  };
}
