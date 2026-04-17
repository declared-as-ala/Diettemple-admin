/** Tiers shown in admin (client header pills, etc.). Warrior removed from product UI; DB may still store legacy "Warrior". */
export const LEVELS = ['Intiate', 'Fighter', 'Champion', 'Elite'] as const;
export type LevelName = (typeof LEVELS)[number];

export function normalizeLevelName(raw?: string | null): LevelName {
  const value = (raw || '').trim().toLowerCase();
  if (value === 'fighter') return 'Fighter';
  // Legacy DB / old links: map to Fighter for asset + UI consistency
  if (value === 'warrior') return 'Fighter';
  if (value === 'champion') return 'Champion';
  if (value === 'elite') return 'Elite';
  return 'Intiate';
}

/** Same PNGs as `Mobile/assets/level`, copied into `admin/public/level` for reliable admin/dashboard delivery. */
export function getLevelImageUrl(raw?: string | null): string {
  const normalized = normalizeLevelName(raw);
  return `/level/${normalized}.png`;
}

