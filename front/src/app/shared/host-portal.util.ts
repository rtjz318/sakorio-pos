export function isCustomerPublicHost(): boolean {
  if (typeof window === 'undefined') return false;

  const host = (window.location.hostname || '').toLowerCase();
  if (!host) return false;

  return host === 'order.sakorio.com' || host === 'restaurant-pos-staging-customer-web.onrender.com';
}
