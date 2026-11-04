#!/usr/bin/env node
import { createRequire } from 'node:module';
import { isHeadless } from './puppeteer-headless.mjs';

const require = createRequire(import.meta.url);
const puppeteer = require('puppeteer-core');

const chromePath =
  process.env.PUPPETEER_EXECUTABLE_PATH ||
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const baseUrl = process.env.BASE_URL || 'http://127.0.0.1:4202';
const tenantId = Number.parseInt(process.env.TENANT_ID || '1', 10);
const publicOrigin = process.env.PUBLIC_ORDER_ORIGIN || baseUrl;

if (!Number.isInteger(tenantId) || tenantId <= 0) throw new Error('TENANT_ID must be positive');

const browser = await puppeteer.launch({
  executablePath: chromePath,
  headless: isHeadless(process.env.HEADLESS),
  args: ['--no-sandbox', '--disable-setuid-sandbox'],
});

async function pageFor(mode) {
  const page = await browser.newPage();
  await page.evaluateOnNewDocument(
    (runtime) => {
      window.__TENANT_ID__ = runtime.tenantId;
      window.__PORTAL_MODE__ = runtime.mode;
      window.__PUBLIC_ORDER_ORIGIN__ = runtime.publicOrigin;
    },
    { tenantId, mode, publicOrigin },
  );
  return page;
}

try {
  const customer = await pageFor('customer');
  await customer.goto(baseUrl, { waitUntil: 'networkidle2' });
  if (!new URL(customer.url()).pathname.startsWith(`/public-menu/${tenantId}`)) {
    throw new Error(`Customer root did not select tenant ${tenantId}: ${customer.url()}`);
  }
  await customer.close();

  const staff = await pageFor('staff');
  await staff.goto(baseUrl, { waitUntil: 'networkidle2' });
  const staffUrl = new URL(staff.url());
  if (staffUrl.pathname !== '/login' || staffUrl.searchParams.get('tenant') !== String(tenantId)) {
    throw new Error(`Staff root did not open tenant login: ${staff.url()}`);
  }
  await staff.waitForSelector('[data-testid="login-tenant-context"]');
  await staff.close();

  const management = await pageFor('management');
  await management.goto(baseUrl, { waitUntil: 'networkidle2' });
  const managementUrl = new URL(management.url());
  if (
    managementUrl.pathname !== '/management/login' ||
    managementUrl.searchParams.get('tenant') !== String(tenantId)
  ) {
    throw new Error(`Management root did not open tenant management login: ${management.url()}`);
  }
  const heading = await management.$eval('h1', (element) => element.textContent?.trim());
  if (heading !== 'Management sign in') {
    throw new Error(`Unexpected management heading: ${heading}`);
  }
  await management.close();

  console.log(`Dedicated portal routing passed for tenant ${tenantId}.`);
} finally {
  await browser.close();
}
