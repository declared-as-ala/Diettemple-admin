const HARDCODED_API_BASE = 'http://145.223.118.9:5000/api';

export function getApiBaseUrl(): string {
  // Always use the hardcoded backend API URL
  return HARDCODED_API_BASE;
}

export function getMediaBaseUrl(): string {
  // Media base is the same host, without the /api suffix
  return HARDCODED_API_BASE.replace(/\/api\/?$/, '');
}
