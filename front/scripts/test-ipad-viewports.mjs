#!/usr/bin/env node
/**
 * Browser QA smoke for iPad/tablet layout.
 *
 * Staff routes require LOGIN_EMAIL/LOGIN_PASSWORD.
 * Customer QR route is optional via CUSTOMER_QR_URL.
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
const loginEmail = process.env.LOGIN_EMAIL || process.env.DEMO_LOGIN_EMAIL;
const loginPassword = process.env.LOGIN_PASSWORD || process.env.DEMO_LOGIN_PASSWORD;
const customerQrUrl = process.env.CUSTOMER_QR_URL || '';

const viewports = [
  { name: 'iPad portrait', width: 820, height: 1180 },
  { name: 'iPad landscape', width: 1180, height: 820 },
];

const staffRoutes = ['/pos', '/tables', '/reservations', '/queue', '/kitchen', '/orders', '/reports', '/my-shift'];

async function bodyText(page) {
  return await page.evaluate(() => document.body?.innerText || '');
}

async function hasBadOverflow(page) {
  return await page.evaluate(() => {
    const doc = document.documentElement;
    const widthOverflow = doc.scrollWidth - doc.clientWidth;
    const fixedOffscreen = [...document.querySelectorAll('button,a,input,select,[role="button"]')]
      .filter((el) => {
        const rect = el.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0 && (rect.right < 0 || rect.left > window.innerWidth + 8);
      })
      .slice(0, 5)
      .map((el) => (el.textContent || el.getAttribute('aria-label') || el.tagName).trim());
    return { widthOverflow, fixedOffscreen };
  });
}

async function login(page) {
  await page.goto(new URL(`/login?tenant=${tenantId}`, baseUrl).href, {
    waitUntil: 'networkidle2',
    timeout: 20000,
  });
  await page.type('input[type="email"]', loginEmail);
  await page.type('input[type="password"]', loginPassword);
  await Promise.allSettled([
    page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 12000 }),
    page.click('button[type="submit"]'),
  ]);
  assert(!page.url().includes('/login'), 'Login failed for iPad viewport test.');
}

async function checkPage(page, label, url) {
  await page.goto(url, { waitUntil: 'networkidle2', timeout: 25000 });
  const text = await bodyText(page);
  assert(text.trim().length > 20, `${label} rendered empty body`);
  assert(!/Application error|Cannot match any routes|404|500|502|503/i.test(text), `${label} shows error text`);
  const overflow = await hasBadOverflow(page);
  assert(overflow.widthOverflow <= 8, `${label} horizontal overflow ${overflow.widthOverflow}px`);
  assert(
    overflow.fixedOffscreen.length === 0,
    `${label} has offscreen controls: ${overflow.fixedOffscreen.join(', ')}`,
  );
  console.log(`  ok ${label}`);
}

async function main() {
  if (!loginEmail || !loginPassword) {
    console.log('SKIP: set LOGIN_EMAIL/LOGIN_PASSWORD or DEMO_LOGIN_EMAIL/DEMO_LOGIN_PASSWORD.');
    process.exit(0);
  }

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: isHeadless(),
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();
  try {
    for (const viewport of viewports) {
      console.log(viewport.name, `${viewport.width}x${viewport.height}`);
      await page.setViewport(viewport);
      await login(page);
      for (const route of staffRoutes) {
        await checkPage(page, `${viewport.name} ${route}`, new URL(route, baseUrl).href);
      }
      if (customerQrUrl) {
        await checkPage(page, `${viewport.name} customer QR`, customerQrUrl);
        const qrText = await bodyText(page);
        assert(!/What's your name/i.test(qrText), 'Customer QR should not block initial browsing with name modal');
      }
    }
    await browser.close();
    console.log('>>> RESULT: iPad viewport smoke passed.');
  } catch (err) {
    await browser.close();
    console.error('FAIL:', err.message);
    process.exit(1);
  }
}

main();
