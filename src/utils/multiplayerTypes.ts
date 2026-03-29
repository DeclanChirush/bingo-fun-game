// ── All shared types ─────────────────────────────────────────

export interface PlayerInfo {
  id: string;
  name: string;
  isHost: boolean;
  score: number; // rounds won
}

export interface CardState {
  numbers: number[][];   // 5x5 grid of 1-25
  crossed: boolean[][];  // which cells are crossed
  completedLines: CompletedLine[]; // lines fully crossed
  bingoLetters: boolean[]; // B I N G O - 5 letters
}

export interface CompletedLine {
  type: 'row' | 'col' | 'diag';
  index: number; // diag: 0 = top-left to bottom-right, 1 = top-right to bottom-left
}

export type GamePhase =
  | 'lobby'        // waiting for host to start
  | 'round_start'  // brief countdown before round
  | 'playing'      // active round
  | 'round_end'    // someone won the round
  | 'game_over';   // all rounds done

export interface GameState {
  phase: GamePhase;
  round: number;
  players: PlayerInfo[];
  callerOrder: string[];
  callerIndex: number;
  calledNumbers: number[];
  shuffledPool: number[];
  roundWinner: string | null;
  locked: boolean;
  totalRounds: number;
}

// ── Messages ─────────────────────────────────────────────────

// Host → all peers
export type HostMsg =
  | { type: 'FULL_STATE'; payload: GameState }
  | { type: 'PLAYER_LIST'; payload: { players: PlayerInfo[] } }
  | { type: 'ROUND_STARTED'; payload: { round: number; callerOrder: string[]; shuffledPool: number[] } }
  | { type: 'NUMBER_CALLED'; payload: { number: number; calledNumbers: number[]; nextCallerIndex: number } }
  | { type: 'ROUND_WON'; payload: { winnerId: string; winnerName: string; scores: Record<string, number> } }
  | { type: 'GAME_OVER'; payload: { scores: Record<string, number> } }
  | { type: 'GAME_RESET'; payload: Record<string, never> }
  | { type: 'JOIN_REJECTED'; payload: { reason: string } }
  | { type: 'PING'; payload: { ts: number } }  // FIX #4: heartbeat
  | { type: 'EMOJI_REACT'; payload: { emoji: string; playerId: string; playerName: string } };

// Peer → host
export type PeerMsg =
  | { type: 'JOIN_REQUEST'; payload: { name: string } }
  | { type: 'CALL_NUMBER'; payload: { number: number; callerId: string } }
  | { type: 'CLAIM_BINGO'; payload: { playerId: string; playerName: string } }
  | { type: 'PONG'; payload: { ts: number } }  // FIX #4: heartbeat reply
  | { type: 'EMOJI_REACT'; payload: { emoji: string; playerId: string; playerName: string } };
