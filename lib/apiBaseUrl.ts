const HARDCODED_HTTP_API = 'http://145.223.118.9:5000/api';

// Base URL used by the admin frontend (browser)
export function getApiBaseUrl(): string {
  // When running on HTTPS (Vercel admin), always use the same-origin proxy
  // to avoid mixed-content errors while still talking to the HTTP backend.
  if (typeof window !== 'undefined' && window.location.protocol === 'https:') {
    return '/api/backend';
  }

  // For local HTTP or non-browser environments, hit the backend directly.
  return HARDCODED_HTTP_API;
}

// Base URL for media/video assets
export function getMediaBaseUrl(): string {
  if (typeof window !== 'undefined' && window.location.protocol === 'https:') {
    return '/api/backend-media';
  }

  return HARDCODED_HTTP_API.replace(/\/api\/?$/, '');
}
