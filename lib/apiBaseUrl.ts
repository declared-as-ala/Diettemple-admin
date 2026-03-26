// Production API (https://next.protein.tn/ serves DietTemple API; routes under /api)
const DEFAULT_API_BASE = 'https://next.protein.tn/api';

function trimTrailingSlash(url: string): string {
  return url.replace(/\/$/, '');
}

// Base URL used by the admin frontend (browser) and server).
// Override for local backend: NEXT_PUBLIC_API_URL=http://localhost:5000/api
//
// If Vercel still has NEXT_PUBLIC_API_URL=http://145... (HTTP), the browser blocks it on HTTPS
// pages (mixed content). On https: origins we always use an https API base.
export function getApiBaseUrl(): string {
  const fromEnv =
    typeof process !== 'undefined' ? process.env.NEXT_PUBLIC_API_URL?.trim() : '';
  let base = fromEnv ? trimTrailingSlash(fromEnv) : DEFAULT_API_BASE;

  if (
    typeof window !== 'undefined' &&
    window.location.protocol === 'https:' &&
    base.startsWith('http:')
  ) {
    base = DEFAULT_API_BASE;
  }

  return base;
}

// Base URL for media/video assets (same host as API, without /api)
export function getMediaBaseUrl(): string {
  return getApiBaseUrl().replace(/\/api\/?$/, '');
}
