// Local backend for development
const HARDCODED_API_BASE = 'http://localhost:5000/api';

// Base URL used by the admin frontend (browser) and server
export function getApiBaseUrl(): string {
  return HARDCODED_API_BASE;
}

// Base URL for media/video assets (same origin, without /api)
export function getMediaBaseUrl(): string {
  return HARDCODED_API_BASE.replace(/\/api\/?$/, '');
}
