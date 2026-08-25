import { commitHash, version } from './commit-hash';

function isNativeShell(): boolean {
  if (typeof window === 'undefined') return false;
  const capacitor = (window as any).Capacitor;
  if (typeof capacitor?.isNativePlatform === 'function' && capacitor.isNativePlatform()) {
    return true;
  }
  return window.location.protocol === 'capacitor:';
}

const SAKORIO_FRONTEND_HOSTS = new Set([
  'staff.sakorio.com',
  'order.sakorio.com',
  'sakorio.com',
  'www.sakorio.com',
  'restaurant-pos-staging-staff-web.onrender.com',
  'restaurant-pos-staging-customer-web.onrender.com',
]);

function sakorioApiUrlFor(hostname: string): string | null {
  return SAKORIO_FRONTEND_HOSTS.has(hostname.toLowerCase()) ? 'https://api.sakorio.com' : null;
}

function isSameOriginApiFallback(raw: string, host: string): boolean {
  try {
    const url = new URL(raw);
    return url.host === host && url.pathname.replace(/\/$/, '') === '/api';
  } catch (_) {
    return raw === '/api';
  }
}

function getApiUrl(): string {
  if (typeof window === 'undefined') return '/api';
  if (isNativeShell()) return 'https://api.sakorio.com';
  const raw = (window as any).__API_URL__;
  const sakorioApi = sakorioApiUrlFor(window.location.hostname || '');
  if (!raw) return sakorioApi ?? '/api';
  if (sakorioApi && isSameOriginApiFallback(raw, window.location.host || '')) return sakorioApi;
  return raw;
}

function getWsUrl(): string {
  if (typeof window === 'undefined') return '';
  if (isNativeShell()) return 'wss://api.sakorio.com/ws';
  const raw = (window as any).__WS_URL__;
  const sakorioApi = sakorioApiUrlFor(window.location.hostname || '');
  const sakorioWs = sakorioApi ? sakorioApi.replace(/^http/, 'ws') + '/ws' : null;
  if (!raw) return sakorioWs ?? `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/ws`;
  if (sakorioWs) {
    try {
      const url = new URL(raw);
      if (url.host === window.location.host && url.pathname.replace(/\/$/, '') === '/ws') return sakorioWs;
    } catch (_) {}
  }
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
