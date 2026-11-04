import assert from 'node:assert/strict';
import { configureNativeIndex } from './configure-native-runtime.mjs';

const source = `
window.__API_URL__ = window.__API_URL__ || '/api';
window.__WS_URL__ = window.__WS_URL__ || '/ws';
window.__TENANT_ID__ = window.__TENANT_ID__ || null;
window.__PORTAL_MODE__ = window.__PORTAL_MODE__ || 'shared';
window.__PUBLIC_ORDER_ORIGIN__ = window.__PUBLIC_ORDER_ORIGIN__ || '';
`;

const configured = configureNativeIndex(source, {
  tenantId: '3',
  apiUrl: 'https://morinaga-api.sakorio.com',
  orderOrigin: 'https://morinaga-order.sakorio.com',
  portalMode: 'staff',
});

assert.match(configured, /window\.__TENANT_ID__ = 3;/);
assert.match(configured, /window\.__PORTAL_MODE__ = "staff";/);
assert.match(configured, /https:\/\/morinaga-api\.sakorio\.com/);
assert.match(configured, /wss:\/\/morinaga-api\.sakorio\.com\/ws/);
assert.match(configured, /https:\/\/morinaga-order\.sakorio\.com/);
assert.throws(
  () =>
    configureNativeIndex(source, {
      tenantId: '0',
      apiUrl: 'https://api.sakorio.com',
      orderOrigin: 'https://order.sakorio.com',
      portalMode: 'staff',
    }),
  /positive integer/,
);

const customer = configureNativeIndex(source, {
  tenantId: '3',
  apiUrl: 'https://morinaga-api.sakorio.com',
  orderOrigin: 'https://morinaga-order.sakorio.com',
  portalMode: 'customer',
});
assert.match(customer, /window\.__PORTAL_MODE__ = "customer";/);
assert.throws(
  () =>
    configureNativeIndex(source, {
      tenantId: '3',
      apiUrl: 'https://api.sakorio.com',
      orderOrigin: 'https://order.sakorio.com',
      portalMode: 'unknown',
    }),
  /SAKORIO_PORTAL_MODE/,
);

console.log('Native runtime configuration tests passed.');
