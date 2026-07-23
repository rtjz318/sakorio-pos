#!/usr/bin/env node
/**
 * Browser QA smoke: log in as each seeded QA role and verify expected route access.
 *
 * Requires:
 *   BASE_URL=https://staff.sakorio.com
 *   QA_ROLE_PASSWORD=...
 *
 * Optional role-specific overrides:
 *   QA_WAITER_EMAIL, QA_HOST_EMAIL, QA_KITCHEN_EMAIL, QA_MANAGER_EMAIL
 */

import { createRequire } from 'module';
import { readFileSync, existsSync } from 'fs';
import { join, resolve } from 'path';
import { fileURLToPath } from 'url';
import { isHeadless } from './puppeteer-headless.mjs';

const require = createRequire(import.meta.url);
const puppeteer = require('puppeteer-core');

const __dirname = resolve(fileURLToPath(import.meta.url), '..');
const repoRoot = resolve(__dirname, '..', '..');

function loadEnv() {
  const envPath = join(repoRoot, '.env');
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    const m = line.match(/^([^#=]+)=(.*)$/);
    if (m && !process.env[m[1].trim()]) {
      process.env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, '');
    }
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

loadEnv();

const CHROME_PATH =
  process.env.PUPPETEER_EXECUTABLE_PATH ||
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

const baseUrl = process.env.BASE_URL || 'http://127.0.0.1:4202';
const tenantId = process.env.TENANT_ID || process.env.LOGIN_TENANT_ID || '1';
const password = process.env.QA_ROLE_PASSWORD || process.env.SAKORIO_QA_PASSWORD;

const roles = [
  {
    name: 'waiter',
    email: process.env.QA_WAITER_EMAIL || 'qa.waiter@sakario.sg',
    allowed: ['/pos', '/tables', '/orders', '/my-shift'],
    restricted: ['/users', '/settings', '/reports'],
  },
  {
    name: 'host',
    email: process.env.QA_HOST_EMAIL || 'qa.host@sakario.sg',
    allowed: ['/reservations', '/queue', '/tables', '/my-shift'],
    restricted: ['/users', '/settings', '/reports'],
  },
  {
    name: 'kitchen',
    email: process.env.QA_KITCHEN_EMAIL || 'qa.kitchen@sakario.sg',
    allowed: ['/kitchen', '/my-shift'],
    restricted: ['/users', '/settings', '/reports'],
  },
  {
    name: 'manager',
    email: process.env.QA_MANAGER_EMAIL || 'qa.manager@sakario.sg',
    allowed: ['/pos', '/tables', '/orders', '/reservations', '/queue', '/kitchen', '/reports', '/users'],
    restricted: [],
  },
];

async function text(page) {
  return await page.evaluate(() => document.body?.innerText || '');
}

async function login(page, email) {
  await page.goto(new URL(`/login?tenant=${tenantId}`, baseUrl).href, {
    waitUntil: 'networkidle2',
    timeout: 20000,
  });
  await page.type('input[type="email"]', email);
  await page.type('input[type="password"]', password);
  await Promise.allSettled([
    page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 12000 }),
    page.click('button[type="submit"]'),
  ]);
  const body = await text(page);
  assert(!page.url().includes('/login'), `${email} stayed on login page. Body: ${body.slice(0, 200)}`);
}

async function logout(page) {
  const clicked = await page.evaluate(() => {
    const button = [...document.querySelectorAll('button,a')].find((el) =>
      (el.textContent || '').trim().toLowerCase() === 'logout',
    );
    if (!button) return false;
    button.click();
    return true;
  });
  if (clicked) await new Promise((r) => setTimeout(r, 1500));
  await page.goto(new URL('/login?tenant=' + tenantId, baseUrl).href, {
    waitUntil: 'networkidle2',
    timeout: 20000,
  });
}

async function routeAccessible(page, route) {
  await page.goto(new URL(route, baseUrl).href, { waitUntil: 'networkidle2', timeout: 20000 });
  const body = await text(page);
  return !page.url().includes('/login') && !/not authorized|forbidden|access denied/i.test(body);
}

async function main() {
  if (!password) {
    console.log('SKIP: set QA_ROLE_PASSWORD or SAKORIO_QA_PASSWORD to run role access matrix.');
    process.exit(0);
  }

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: isHeadless(),
    defaultViewport: { width: 1180, height: 820 },
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();
  try {
    for (const role of roles) {
      console.log(`Role: ${role.name} <${role.email}>`);
      await login(page, role.email);
      for (const route of role.allowed) {
        assert(await routeAccessible(page, route), `${role.name} should access ${route}`);
        console.log(`  allow ${route}`);
      }
      for (const route of role.restricted) {
        assert(!(await routeAccessible(page, route)), `${role.name} should be restricted from ${route}`);
        console.log(`  restrict ${route}`);
      }
      await logout(page);
    }
    await browser.close();
    console.log('>>> RESULT: role access matrix passed.');
  } catch (err) {
    await browser.close();
    console.error('FAIL:', err.message);
    process.exit(1);
  }
}

main();
