/**
 * Base URL for the DietTemple API.
 * When the app is on HTTPS (e.g. Vercel) and the backend is HTTP, the browser
 * would block requests (Mixed Content). So we use a same-origin proxy (/api/backend)
 * that forwards to the HTTP backend.
 */
const DEFAULT_HTTP_API = 'http://145.223.118.9:5000/api';

export function getApiBaseUrl(): string {
  if (typeof window !== 'undefined' && window.location.protocol === 'https:') {
    const envUrl = process.env.NEXT_PUBLIC_API_URL;
    if (envUrl && envUrl.startsWith('https://')) return envUrl;
    return '/api/backend';
  }
  return process.env.NEXT_PUBLIC_API_URL || DEFAULT_HTTP_API;
}

/** Base URL for media/video assets (e.g. /media/...). Use proxy when on HTTPS. */
export function getMediaBaseUrl(): string {
  if (typeof window !== 'undefined' && window.location.protocol === 'https:') {
    const envUrl = process.env.NEXT_PUBLIC_API_URL;
    if (envUrl && envUrl.startsWith('https://')) return envUrl.replace(/\/api\/?$/, '');
    return '/api/backend-media';
  }
  const envUrl = process.env.NEXT_PUBLIC_API_URL;
  if (envUrl) return envUrl.replace(/\/api\/?$/, '');
  return DEFAULT_HTTP_API.replace(/\/api\/?$/, '');
}
