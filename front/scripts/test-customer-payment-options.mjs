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
const tablesComponent = read('src/app/tables/tables.component.ts');
const globalStyles = read('src/styles.scss');

assert(
  menuTemplate.includes("PAYMENTS.PAY_WITH_HITPAY"),
  'Customer QR payment sheet must keep HitPay as a payment option.',
);
assert(
  menuTemplate.includes("PAYMENTS.PAY_AT_CASHIER"),
  'Customer QR payment sheet must offer Pay at cashier.',
);
assert(
  menuTemplate.includes('customerOnlinePaymentEnabled()'),
  'Customer QR payment sheet must respect the online-payment switch.',
);
assert(
  menuTemplate.includes("PAYMENTS.ONLINE_PAYMENT_UNAVAILABLE"),
  'Customer QR payment sheet must explain when online payment is disabled.',
);
assert(
  !menuTemplate.includes("PAYMENTS.PAY_CARD_TERMINAL"),
  'Customer QR payment sheet must not imply that a waiter brings a terminal.',
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
  !menuComponent.includes('selectPayCard') && !menuComponent.includes('paymentMessageTarget'),
  'Customer QR menu must not retain the old at-table terminal request flow.',
);
assert(
  menuComponent.includes('payAtCashier()'),
  'Customer QR menu must send the cashier payment request directly.',
);
assert(
  !/if\s*\(\s*!customerName\s*\)\s*\{[\s\S]*?this\.showNameModal\.set\(true\)/.test(menuComponent),
  'Customer QR menu must not block initial browsing with an optional name modal.',
);
assert(
  apiService.includes("paymentMethod: 'card_terminal'"),
  'Customer QR cashier request API must stay typed as terminal-only.',
);
assert(
  apiService.includes('updateCustomerOnlinePayment('),
  'Cashier API must expose the tenant online-payment switch.',
);
assert(
  tablesComponent.includes('Print fixed QR for') && tablesComponent.includes('Print table QR'),
  'Tables must expose the fixed QR print entry point and print action.',
);
assert(
  globalStyles.includes('body.sakorio-table-qr-printing'),
  'Global print styles must isolate the table QR from the rest of the POS.',
);

const i18nDir = join(root, 'public/i18n');
for (const file of readdirSync(i18nDir).filter((name) => name.endsWith('.json'))) {
  const content = read(`public/i18n/${file}`);
  const json = JSON.parse(content);
  assert(json.PAYMENTS, `${file} must contain PAYMENTS translations.`);
  for (const key of [
    'ONLINE_PAYMENT_UNAVAILABLE',
    'ONLINE_PAYMENT_UNAVAILABLE_DESC',
    'PAY_AT_CASHIER',
    'PAY_AT_CASHIER_DESC',
    'CASHIER_PAYMENT_REQUESTED',
    'CASHIER_PAYMENT_REQUESTED_DESC',
  ]) {
    assert(key in json.PAYMENTS, `${file} must contain PAYMENTS.${key}.`);
  }
  assert(!('PAY_CASH' in json.PAYMENTS), `${file} must not contain PAYMENTS.PAY_CASH.`);
  assert(!('PAY_CASH_DESC' in json.PAYMENTS), `${file} must not contain PAYMENTS.PAY_CASH_DESC.`);
}

console.log('Customer QR payment, cashier handoff, and fixed QR printing checks passed.');
