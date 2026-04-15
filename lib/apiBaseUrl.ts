// Default backend endpoint (production)
const DEFAULT_API_BASE = 'https://next.protein.tn/api';

function trimTrailingSlash(url: string): string {
  return url.replace(/\/$/, '');
}

// Base URL used by the admin frontend (browser and server).
// Override via: NEXT_PUBLIC_API_URL=https://next.protein.tn/api
// Example local override: NEXT_PUBLIC_API_URL=http://localhost:5000/api
export function getApiBaseUrl(): string {
  const fromEnv =
    typeof process !== 'undefined' ? process.env.NEXT_PUBLIC_API_URL?.trim() : '';
  const base = fromEnv ? trimTrailingSlash(fromEnv) : DEFAULT_API_BASE;
  return base;
}

// Base URL for media/video assets (same host as API, without /api)
export function getMediaBaseUrl(): string {
  return getApiBaseUrl().replace(/\/api\/?$/, '');
}
