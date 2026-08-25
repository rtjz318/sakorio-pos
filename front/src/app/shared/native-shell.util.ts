export const NATIVE_SAKORIO_TENANT_ID = 1;

export function isNativeShell(): boolean {
  if (typeof window === 'undefined') return false;
  const capacitor = (window as any).Capacitor;
  if (typeof capacitor?.isNativePlatform === 'function' && capacitor.isNativePlatform()) {
    return true;
  }
  return window.location.protocol === 'capacitor:';
}
