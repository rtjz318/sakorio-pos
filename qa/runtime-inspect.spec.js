const { test, expect } = require('playwright/test');

const baseUrl = process.env.QA_BASE_URL || 'http://localhost:4202';
const email = process.env.QA_EMAIL;
const password = process.env.QA_PASSWORD;

test.use({
  viewport: { width: 1440, height: 1000 },
  ignoreHTTPSErrors: true,
});

test('capture authenticated Sakorio operator surfaces', async ({ page }) => {
  if (!email || !password) {
    throw new Error('QA_EMAIL and QA_PASSWORD are required for authenticated runtime inspection.');
  }

  const consoleErrors = [];
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });

  await page.goto(`${baseUrl}/login`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2500);

  const emailInput = page.locator('input[type="email"]').first();
  const passwordInput = page.locator('input[type="password"]').first();
  await expect(emailInput).toBeVisible({ timeout: 15000 });
  await emailInput.fill(email);
  await passwordInput.fill(password);
  await page.getByRole('button', { name: /login|sign in/i }).first().click();
  await page.waitForURL((url) => !url.pathname.endsWith('/login'), { timeout: 20000 });
  await page.waitForTimeout(2000);

  for (const path of ['/pos', '/tables', '/orders', '/queue', '/reservations', '/kitchen', '/dashboard']) {
    await page.goto(`${baseUrl}${path}`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1800);
    const name = path.slice(1) || 'home';
    await page.screenshot({ path: `qa/screenshots/${name}-desktop.png`, fullPage: true });
    console.log(`${name}: ${await page.locator('body').innerText().then((text) => text.slice(0, 300).replace(/\s+/g, ' '))}`);
  }

  expect(consoleErrors, `Browser console errors:\n${consoleErrors.join('\n')}`).toEqual([]);
});
