import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

function positiveInteger(value, name) {
  const parsed = Number.parseInt(String(value ?? ''), 10);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`${name} must be a positive integer`);
  }
  return parsed;
}

function httpsUrl(value, name) {
  const parsed = new URL(String(value ?? ''));
  if (parsed.protocol !== 'https:') throw new Error(`${name} must use https`);
  return parsed.toString().replace(/\/$/, '');
}

function portalMode(value) {
  const mode = String(value ?? 'staff').trim().toLowerCase();
  if (!['customer', 'staff', 'management'].includes(mode)) {
    throw new Error('SAKORIO_PORTAL_MODE must be customer, staff, or management');
  }
  return mode;
}

export function configureNativeIndex(source, config) {
  const tenantId = positiveInteger(config.tenantId, 'SAKORIO_TENANT_ID');
  const apiUrl = httpsUrl(config.apiUrl, 'SAKORIO_API_URL');
  const orderOrigin = httpsUrl(config.orderOrigin, 'SAKORIO_PUBLIC_ORDER_ORIGIN');
  const mode = portalMode(config.portalMode);
  const wsUrl = config.wsUrl
    ? httpsUrl(String(config.wsUrl).replace(/^wss:/, 'https:'), 'SAKORIO_WS_URL').replace(
        /^https:/,
        'wss:',
      )
    : apiUrl.replace(/^https:/, 'wss:') + '/ws';
  const replacements = [
    [/window\.__API_URL__ = .*?;/, `window.__API_URL__ = ${JSON.stringify(apiUrl)};`],
    [/window\.__WS_URL__ = .*?;/, `window.__WS_URL__ = ${JSON.stringify(wsUrl)};`],
    [/window\.__TENANT_ID__ = .*?;/, `window.__TENANT_ID__ = ${tenantId};`],
    [/window\.__PORTAL_MODE__ = .*?;/, `window.__PORTAL_MODE__ = ${JSON.stringify(mode)};`],
    [
      /window\.__PUBLIC_ORDER_ORIGIN__ = .*?;/,
      `window.__PUBLIC_ORDER_ORIGIN__ = ${JSON.stringify(orderOrigin)};`,
    ],
  ];

  let output = source;
  for (const [pattern, replacement] of replacements) {
    if (!pattern.test(output)) throw new Error(`Native runtime marker not found: ${pattern}`);
    output = output.replace(pattern, replacement);
  }
  return output;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const indexPath = resolve(process.argv[2] || 'dist/front/browser/index.html');
  const configured = configureNativeIndex(readFileSync(indexPath, 'utf8'), {
    tenantId: process.env.SAKORIO_TENANT_ID,
    apiUrl: process.env.SAKORIO_API_URL,
    orderOrigin: process.env.SAKORIO_PUBLIC_ORDER_ORIGIN,
    portalMode: process.env.SAKORIO_PORTAL_MODE || 'staff',
    wsUrl: process.env.SAKORIO_WS_URL,
  });
  writeFileSync(indexPath, configured, 'utf8');
  console.log(
    `[built-runtime] configured tenant ${process.env.SAKORIO_TENANT_ID} (${process.env.SAKORIO_PORTAL_MODE || 'staff'}) in ${indexPath}`,
  );
}
