/**
 * Shared stats via JSONBin.io (free, no auth required for public bins).
 * All visitors to the Vercel deployment share the same counters.
 *
 * HOW TO SET UP (one-time, takes 2 minutes):
 * 1. Go to https://jsonbin.io and create a free account.
 * 2. Create a new bin with this JSON:  { "totalGames": 0, "totalPlayers": 0, "totalRoundsPlayed": 0 }
 * 3. Copy your Bin ID (looks like: 65f1a2b3c4d5e6f7a8b9c0d1)
 * 4. Create an Access Key (API Keys tab) with READ+UPDATE permission.
 * 5. Set the two env vars in Vercel: VITE_JSONBIN_BIN_ID and VITE_JSONBIN_API_KEY
 *
 * Until env vars are set, the app falls back to localStorage (device-only).
 */

const BIN_ID  = import.meta.env.VITE_JSONBIN_BIN_ID  as string | undefined;
const API_KEY = import.meta.env.VITE_JSONBIN_API_KEY as string | undefined;
const BIN_URL = BIN_ID ? `https://api.jsonbin.io/v3/b/${BIN_ID}` : null;

export interface SharedStats {
  totalGames: number;
  totalPlayers: number;
  totalRoundsPlayed: number;
}

const EMPTY: SharedStats = { totalGames: 0, totalPlayers: 0, totalRoundsPlayed: 0 };
const LOCAL_KEY = 'bingo_stats';

// ── Local fallback ────────────────────────────────────────────
function localLoad(): SharedStats {
  try {
    const raw = localStorage.getItem(LOCAL_KEY);
    return raw ? { ...EMPTY, ...JSON.parse(raw) } : { ...EMPTY };
  } catch { return { ...EMPTY }; }
}
function localSave(s: SharedStats) {
  try { localStorage.setItem(LOCAL_KEY, JSON.stringify(s)); } catch {}
}

// ── Remote fetch (JSONBin) ────────────────────────────────────
export async function fetchStats(): Promise<SharedStats> {
  if (!BIN_URL || !API_KEY) return localLoad();
  try {
    const res = await fetch(`${BIN_URL}/latest`, {
      headers: { 'X-Access-Key': API_KEY },
    });
    if (!res.ok) throw new Error('fetch failed');
    const json = await res.json();
    const record = json.record as SharedStats;
    // Cache locally so home screen loads instantly on next visit
    localSave(record);
    return record;
  } catch {
    return localLoad(); // graceful fallback
  }
}

// ── Remote increment ──────────────────────────────────────────
export async function incrementStats(numPlayers: number, numRounds: number): Promise<void> {
  if (!BIN_URL || !API_KEY) {
    // Fallback: update localStorage only
    const s = localLoad();
    s.totalGames += 1;
    s.totalPlayers += numPlayers;
    s.totalRoundsPlayed += numRounds;
    localSave(s);
    return;
  }

  try {
    // Read current value first
    const res = await fetch(`${BIN_URL}/latest`, {
      headers: { 'X-Access-Key': API_KEY },
    });
    if (!res.ok) throw new Error('read failed');
    const json = await res.json();
    const current = json.record as SharedStats;

    const updated: SharedStats = {
      totalGames:       (current.totalGames       ?? 0) + 1,
      totalPlayers:     (current.totalPlayers     ?? 0) + numPlayers,
      totalRoundsPlayed:(current.totalRoundsPlayed ?? 0) + numRounds,
    };

    // Write back
    await fetch(BIN_URL, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'X-Access-Key': API_KEY,
      },
      body: JSON.stringify(updated),
    });

    localSave(updated);
  } catch {
    // Best-effort: at least update local
    const s = localLoad();
    s.totalGames += 1;
    s.totalPlayers += numPlayers;
    s.totalRoundsPlayed += numRounds;
    localSave(s);
  }
}
