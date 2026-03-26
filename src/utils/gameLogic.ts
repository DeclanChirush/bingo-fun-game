import type { CardState, CompletedLine } from './multiplayerTypes';

/** Shuffle array (Fisher-Yates) */
export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Generate a 5x5 card with numbers 1-25 in shuffled positions */
export function generateCard(): CardState {
  const nums = shuffle(Array.from({ length: 25 }, (_, i) => i + 1));
  const numbers: number[][] = [];
  const crossed: boolean[][] = [];
  for (let r = 0; r < 5; r++) {
    numbers.push(nums.slice(r * 5, r * 5 + 5));
    crossed.push([false, false, false, false, false]);
  }
  return { numbers, crossed, completedLines: [], bingoLetters: [false, false, false, false, false] };
}

/** Generate a fresh pool (1-25 in order — displayed in order, calling order is up to user) */
export function generatePool(): number[] {
  return Array.from({ length: 25 }, (_, i) => i + 1);
}

/** Apply a called number to a card — auto-crosses the cell and detects new lines */
export function applyNumber(card: CardState, num: number): CardState {
  const crossed = card.crossed.map(r => [...r]);

  for (let r = 0; r < 5; r++) {
    for (let c = 0; c < 5; c++) {
      if (card.numbers[r][c] === num) crossed[r][c] = true;
    }
  }

  const newLines = detectLines(crossed);
  const prevKeys = new Set(card.completedLines.map(lineKey));
  const addedLines = newLines.filter(l => !prevKeys.has(lineKey(l)));

  const bingoLetters = [...card.bingoLetters];
  const nextIdx = bingoLetters.filter(Boolean).length;
  addedLines.forEach((_, i) => {
    if (nextIdx + i < 5) bingoLetters[nextIdx + i] = true;
  });

  return { ...card, crossed, completedLines: [...card.completedLines, ...addedLines], bingoLetters };
}

/** Detect all completed lines: 5 rows + 5 cols + 2 diagonals */
function detectLines(crossed: boolean[][]): CompletedLine[] {
  const lines: CompletedLine[] = [];
  // Rows
  for (let r = 0; r < 5; r++) {
    if (crossed[r].every(Boolean)) lines.push({ type: 'row', index: r });
  }
  // Cols
  for (let c = 0; c < 5; c++) {
    if (crossed.every(row => row[c])) lines.push({ type: 'col', index: c });
  }
  // Diagonal top-left → bottom-right
  if ([0,1,2,3,4].every(i => crossed[i][i])) lines.push({ type: 'diag', index: 0 });
  // Diagonal top-right → bottom-left
  if ([0,1,2,3,4].every(i => crossed[i][4 - i])) lines.push({ type: 'diag', index: 1 });
  return lines;
}

export function lineKey(l: CompletedLine): string {
  return `${l.type}-${l.index}`;
}

/** Returns true if a given cell [r,c] is part of a completed line */
export function cellOnCompletedLine(lines: CompletedLine[], r: number, c: number): boolean {
  return lines.some(l => {
    if (l.type === 'row') return l.index === r;
    if (l.type === 'col') return l.index === c;
    if (l.type === 'diag') return l.index === 0 ? r === c : r === 4 - c;
    return false;
  });
}

/** Win = all 5 BINGO letters crossed */
export function isFullBingo(card: CardState): boolean {
  return card.bingoLetters.every(Boolean);
}

/** Build caller order for a given round — shifts start index each round */
export function buildCallerOrder(playerIds: string[], round: number): string[] {
  const offset = (round - 1) % playerIds.length;
  return [...playerIds.slice(offset), ...playerIds.slice(0, offset)];
}
