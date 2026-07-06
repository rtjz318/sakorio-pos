import { commitHash, version } from './commit-hash';

function getApiUrl(): string {
  if (typeof window === 'undefined') return '/api';
  const raw = (window as any).__API_URL__;
  if (!raw) return '/api';
  return raw;
}

function getWsUrl(): string {
  if (typeof window === 'undefined') return '';
  const raw = (window as any).__WS_URL__;
  if (!raw) return `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/ws`;
  return raw;
}

export const environment = {
  production: true,
  staging: false,
  apiUrl: getApiUrl(),
  wsUrl: getWsUrl(),
  version,
  commitHash,
};
