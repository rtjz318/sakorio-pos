import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const root = new URL('..', import.meta.url).pathname;

function read(relativePath) {
  return readFileSync(join(root, relativePath), 'utf8');
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

const menuTemplate = read('src/app/menu/menu.component.html');
const menuComponent = read('src/app/menu/menu.component.ts');
const apiService = read('src/app/services/api.service.ts');

assert(
  menuTemplate.includes("PAYMENTS.PAY_WITH_HITPAY"),
  'Customer QR payment sheet must keep HitPay as a payment option.',
);
assert(
  menuTemplate.includes("PAYMENTS.PAY_CARD_TERMINAL"),
  'Customer QR payment sheet must keep Terminal as a payment option.',
);
assert(
  !menuTemplate.includes("PAYMENTS.PAY_CASH"),
  'Customer QR payment sheet must not render a Cash option.',
);
assert(
  !menuComponent.includes('selectPayCash'),
  'Customer QR menu component must not expose a selectPayCash handler.',
);
assert(
  apiService.includes("paymentMethod: 'card_terminal'"),
  'Customer QR requestPayment API must stay typed as terminal-only.',
);

const i18nDir = join(root, 'public/i18n');
for (const file of readdirSync(i18nDir).filter((name) => name.endsWith('.json'))) {
  const content = read(`public/i18n/${file}`);
  const json = JSON.parse(content);
  assert(json.PAYMENTS, `${file} must contain PAYMENTS translations.`);
  assert(!('PAY_CASH' in json.PAYMENTS), `${file} must not contain PAYMENTS.PAY_CASH.`);
  assert(!('PAY_CASH_DESC' in json.PAYMENTS), `${file} must not contain PAYMENTS.PAY_CASH_DESC.`);
}

console.log('Customer QR payment options are HitPay / Terminal only.');
