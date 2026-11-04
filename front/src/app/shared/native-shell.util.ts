import { getRuntimeTenantId } from './runtime-config.util';

/**
 * Native builds must be branded at build time with SAKORIO_TENANT_ID.
 * There is deliberately no demo-tenant fallback: silently opening another
 * restaurant is more dangerous than refusing an unconfigured build.
 */
export function getNativeSakorioTenantId(): number | null {
  return getRuntimeTenantId();
}

export function isNativeShell(): boolean {
  if (typeof window === 'undefined') return false;
  const capacitor = (window as any).Capacitor;
  if (typeof capacitor?.isNativePlatform === 'function' && capacitor.isNativePlatform()) {
    return true;
  }
  return window.location.protocol === 'capacitor:';
}
