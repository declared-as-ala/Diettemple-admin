// Production API (https://next.protein.tn/ serves DietTemple API; routes under /api)
const DEFAULT_API_BASE = 'https://next.protein.tn/api';

function trimTrailingSlash(url: string): string {
  return url.replace(/\/$/, '');
}

// Base URL used by the admin frontend (browser) and server).
// Override for local backend: NEXT_PUBLIC_API_URL=http://localhost:5000/api
export function getApiBaseUrl(): string {
  const fromEnv =
    typeof process !== 'undefined' ? process.env.NEXT_PUBLIC_API_URL?.trim() : '';
  if (fromEnv) return trimTrailingSlash(fromEnv);
  return DEFAULT_API_BASE;
}

// Base URL for media/video assets (same host as API, without /api)
export function getMediaBaseUrl(): string {
  return getApiBaseUrl().replace(/\/api\/?$/, '');
}
