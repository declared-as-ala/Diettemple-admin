export const LEVELS = ['Intiate', 'Fighter', 'Warrior', 'Champion', 'Elite'] as const;
export type LevelName = (typeof LEVELS)[number];

export function normalizeLevelName(raw?: string | null): LevelName {
  const value = (raw || '').trim().toLowerCase();
  if (value === 'fighter') return 'Fighter';
  if (value === 'warrior') return 'Warrior';
  if (value === 'champion') return 'Champion';
  if (value === 'elite') return 'Elite';
  return 'Intiate';
}

export function getLevelImageUrl(raw?: string | null): string {
  const normalized = normalizeLevelName(raw);
  return `/api/level-assets/${encodeURIComponent(normalized)}`;
}

