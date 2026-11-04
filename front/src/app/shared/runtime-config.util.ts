export type SakorioPortalMode = 'shared' | 'customer' | 'staff' | 'management';

declare global {
  interface Window {
    __API_URL__?: string;
    __WS_URL__?: string;
    __TENANT_ID__?: number | string | null;
    __PORTAL_MODE__?: SakorioPortalMode | string | null;
    __PUBLIC_ORDER_ORIGIN__?: string | null;
  }
}

export function getRuntimeTenantId(): number | null {
  if (typeof window === 'undefined') return null;
  const parsed = Number.parseInt(String(window.__TENANT_ID__ ?? ''), 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

export function getRuntimePortalMode(): SakorioPortalMode {
  if (typeof window === 'undefined') return 'shared';
  const mode = String(window.__PORTAL_MODE__ ?? '').trim().toLowerCase();
  return mode === 'customer' || mode === 'staff' || mode === 'management' ? mode : 'shared';
}

export function getRuntimePublicOrderOrigin(): string | null {
  if (typeof window === 'undefined') return null;
  const raw = String(window.__PUBLIC_ORDER_ORIGIN__ ?? '').trim();
  if (!raw) return null;
  try {
    const url = new URL(raw);
    return url.protocol === 'https:' || url.hostname === 'localhost' ? url.origin : null;
  } catch (_) {
    return null;
  }
}
