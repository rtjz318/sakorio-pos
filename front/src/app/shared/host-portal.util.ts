export function isCustomerPublicHost(): boolean {
  if (typeof window === 'undefined') return false;

  const host = (window.location.hostname || '').toLowerCase();
  if (!host) return false;

  return host === 'order.sakorio.com' || host === 'restaurant-pos-staging-customer-web.onrender.com';
}

/**
 * Customer-facing links must never inherit the staff/owner hostname in production.
 * Local development stays on the current origin so the full QR flow remains testable.
 */
export function getCustomerPublicOrigin(): string {
  if (typeof window === 'undefined') return 'https://order.sakorio.com';

  const host = (window.location.hostname || '').toLowerCase();
  if (host === 'localhost' || host === '127.0.0.1') {
    return window.location.origin;
  }

  return 'https://order.sakorio.com';
}
