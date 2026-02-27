/**
 * Base URL for the DietTemple API.
 * When the app is served over HTTPS (e.g. on Vercel), the URL must be HTTPS
 * or the browser will block requests (Mixed Content).
 */
const DEFAULT_API_BASE = 'http://145.223.118.9:5000/api';

export function getApiBaseUrl(): string {
  const envUrl = process.env.NEXT_PUBLIC_API_URL;
  if (envUrl) return envUrl;
  if (typeof window !== 'undefined' && window.location.protocol === 'https:') {
    return DEFAULT_API_BASE.replace(/^http:\/\//, 'https://');
  }
  return DEFAULT_API_BASE;
}
