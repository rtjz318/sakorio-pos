import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import vm from 'node:vm';
import ts from 'typescript';

const root = process.cwd();
const sourcePath = join(root, 'src/app/services/escpos-receipt-renderer.ts');
const source = readFileSync(sourcePath, 'utf8');

const compiled = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2022,
  },
});

const sandbox = {
  exports: {},
  TextEncoder,
  Uint8Array,
  console,
};
vm.createContext(sandbox);
vm.runInContext(compiled.outputText, sandbox, {
  filename: 'escpos-receipt-renderer.js',
});

const { receiptText, renderEscposReceipt } = sandbox.exports;

const failures = [];

function assert(condition, message) {
  if (!condition) failures.push(message);
}

function assertIncludes(text, expected, caseId) {
  assert(text.includes(expected), `${caseId}: expected receipt to include "${expected}"`);
}

function assertNotIncludes(text, unexpected, caseId) {
  assert(!text.includes(unexpected), `${caseId}: receipt should not include "${unexpected}"`);
}

function runCase(caseId, description, payload, checks) {
  const text = receiptText(payload);
  const bytes = renderEscposReceipt(payload);

  assert(bytes instanceof Uint8Array, `${caseId}: renderEscposReceipt must return Uint8Array`);
  assert(bytes[0] === 0x1b && bytes[1] === 0x40, `${caseId}: missing ESC/POS initialize bytes`);
  assert(
    bytes[bytes.length - 3] === 0x1d && bytes[bytes.length - 2] === 0x56,
    `${caseId}: missing ESC/POS paper cut command`,
  );
  assert(!text.includes('\u0000'), `${caseId}: receipt text should not include null bytes`);
  assert(
    text.split('\n').every((line) => line.length <= 42),
    `${caseId}: every receipt line should fit 80mm width`,
  );

  checks(text, bytes);
  console.log(`[xp80t-receipt-test] ${caseId} OK — ${description}`);
}

runCase(
  'XP80T-R01',
  'Kitchen ticket for table QR first round with item notes',
  {
    receipt_type: 'KITCHEN',
    station_name: 'Kitchen',
    order_id: 8801,
    table_name: 'T09',
    submitted_at: '2026-08-18 19:10',
    items: [
      {
        quantity: 2,
        name: 'Deep Fried Dumpling',
        customization: 'Less oil',
        notes: 'No chilli for one portion',
      },
      {
        quantity: 1,
        name: 'Shrimp with Chilli Sauce',
        notes: 'Serve after drinks',
      },
    ],
    order_notes: 'Customer is seated near entrance.',
  },
  (text) => {
    assertIncludes(text, 'KITCHEN', 'XP80T-R01');
    assertIncludes(text, 'TABLE: T09', 'XP80T-R01');
    assertIncludes(text, '2 x Deep Fried Dumpling', 'XP80T-R01');
    assertIncludes(text, 'No chilli for one portion', 'XP80T-R01');
    assertIncludes(text, 'ORDER NOTE', 'XP80T-R01');
    assertNotIncludes(text, 'TOTAL', 'XP80T-R01');
  },
);

runCase(
  'XP80T-R02',
  'Customer paid receipt with totals and payment method',
  {
    receipt_type: 'CUSTOMER RECEIPT',
    station_name: 'Cashier',
    order_id: 8802,
    table_name: 'T03',
    submitted_at: '2026-08-18 20:05',
    currency_code: 'SGD',
    payment_method: 'hitpay',
    items: [
      {
        quantity: 1,
        name: 'Daiyame Glass',
        line_total_cents: 1000,
      },
      {
        quantity: 3,
        name: 'Deep Fried C1 Dumpling',
        line_total_cents: 1800,
      },
    ],
    subtotal_cents: 2800,
    tip_cents: 200,
    total_cents: 3000,
  },
  (text) => {
    assertIncludes(text, 'CUSTOMER RECEIPT', 'XP80T-R02');
    assertIncludes(text, 'SGD 10.00', 'XP80T-R02');
    assertIncludes(text, 'SUBTOTAL', 'XP80T-R02');
    assertIncludes(text, 'SGD 28.00', 'XP80T-R02');
    assertIncludes(text, 'TIP', 'XP80T-R02');
    assertIncludes(text, 'TOTAL', 'XP80T-R02');
    assertIncludes(text, 'PAID VIA: HITPAY', 'XP80T-R02');
    assertIncludes(text, 'THANK YOU', 'XP80T-R02');
  },
);

runCase(
  'XP80T-R03',
  'Long product names stay inside 80mm print width',
  {
    receipt_type: 'CUSTOMER RECEIPT',
    station_name: 'Cashier',
    order_id: 8803,
    table_name: 'T12',
    currency_code: 'SGD',
    payment_method: 'terminal',
    items: [
      {
        quantity: 12,
        name: 'Extremely Long Sakorio Menu Item Name With Add Ons And Special Kitchen Handling',
        line_total_cents: 123456,
        notes: 'Very long note that should wrap safely and never overflow the physical receipt line width.',
      },
    ],
    subtotal_cents: 123456,
    total_cents: 123456,
  },
  (text) => {
    assertIncludes(text, 'SGD 1234.56', 'XP80T-R03');
    assertIncludes(text, 'PAID VIA: TERMINAL', 'XP80T-R03');
  },
);

runCase(
  'XP80T-R04',
  'Counter order fallback without table or item details',
  {
    receipt_type: 'KITCHEN',
    station_name: 'Beverage',
    order_id: 'WALK-IN-1',
    submitted_at: '2026-08-18 21:30',
    items: [],
  },
  (text) => {
    assertIncludes(text, 'Beverage', 'XP80T-R04');
    assertIncludes(text, 'ORDER #WALK-IN-1', 'XP80T-R04');
    assertIncludes(text, 'TABLE: Counter', 'XP80T-R04');
  },
);

if (failures.length) {
  console.error('[xp80t-receipt-test] failed');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('[xp80t-receipt-test] all XP-80T receipt renderer use cases passed');
