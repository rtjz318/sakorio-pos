import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import vm from 'node:vm';
import ts from 'typescript';

const root = process.cwd();

function compileCommonJs(path) {
  const source = readFileSync(join(root, path), 'utf8');
  return ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
}

function loadModule(path, requireMap = {}) {
  const sandbox = {
    exports: {},
    require: (name) => {
      if (requireMap[name]) return requireMap[name];
      throw new Error(`Unexpected require(${name}) while loading ${path}`);
    },
    TextEncoder,
    Uint8Array,
    console,
  };
  vm.createContext(sandbox);
  vm.runInContext(compileCommonJs(path), sandbox, { filename: path });
  return sandbox.exports;
}

const renderer = loadModule('src/app/services/escpos-receipt-renderer.ts');
const runnerModule = loadModule('src/app/services/ipad-printer-job-runner.ts', {
  './escpos-receipt-renderer': renderer,
});

const { runIpadPrintJob } = runnerModule;
const failures = [];

function assert(condition, message) {
  if (!condition) failures.push(message);
}

function makeJob(id, payload) {
  return {
    id,
    lease_token: `lease-token-${id}`,
    job_type: payload.receipt_type === 'CUSTOMER RECEIPT' ? 'customer_receipt' : 'kitchen_receipt',
    order_id: 9000 + id,
    kitchen_station_id: payload.receipt_type === 'CUSTOMER RECEIPT' ? null : 1,
    payload,
  };
}

async function runSuccessCase() {
  const events = [];
  const job = makeJob(1, {
    receipt_type: 'KITCHEN',
    station_name: 'Main Kitchen',
    order_id: 9001,
    table_name: 'T09',
    items: [
      {
        quantity: 1,
        name: 'Deep Fried Dumpling',
        notes: 'No chilli',
      },
    ],
  });

  const result = await runIpadPrintJob(job, {
    async printEscPos(jobId, bytes) {
      events.push(['print', jobId, bytes.length, bytes[0], bytes[1]]);
    },
    async complete(jobId, leaseToken) {
      events.push(['complete', jobId, leaseToken]);
    },
    async fail(jobId, leaseToken, error) {
      events.push(['fail', jobId, leaseToken, error]);
    },
  });

  assert(result.printed === true, 'success case should mark job printed');
  assert(result.error === null, 'success case should not return error');
  assert(result.byteLength > 40, 'success case should render non-empty ESC/POS bytes');
  assert(events.length === 2, 'success case should call print and complete only');
  assert(events[0][0] === 'print', 'success case first event should be print');
  assert(events[0][3] === 0x1b && events[0][4] === 0x40, 'success case should initialize ESC/POS');
  assert(events[1][0] === 'complete', 'success case should complete job');
  assert(events[1][2] === 'lease-token-1', 'success case should complete with lease token');
}

async function runCustomerReceiptCase() {
  const events = [];
  const job = makeJob(2, {
    receipt_type: 'CUSTOMER RECEIPT',
    station_name: 'Cashier',
    order_id: 9002,
    table_name: 'T03',
    currency_code: 'SGD',
    payment_method: 'terminal',
    subtotal_cents: 2800,
    tip_cents: 200,
    total_cents: 3000,
    items: [
      {
        quantity: 2,
        name: 'Daiyame Glass',
        line_total_cents: 2000,
      },
      {
        quantity: 1,
        name: 'Deep Fried C1 Dumpling',
        line_total_cents: 800,
      },
    ],
  });

  const result = await runIpadPrintJob(job, {
    async printEscPos(jobId, bytes) {
      events.push(['print', jobId, bytes.length]);
    },
    async complete(jobId, leaseToken) {
      events.push(['complete', jobId, leaseToken]);
    },
    async fail(jobId, leaseToken, error) {
      events.push(['fail', jobId, leaseToken, error]);
    },
  });

  assert(result.printed === true, 'customer receipt should print');
  assert(events.some((event) => event[0] === 'complete'), 'customer receipt should complete');
  assert(result.byteLength > 100, 'customer receipt should include totals and footer bytes');
}

async function runFailureCase() {
  const events = [];
  const job = makeJob(3, {
    receipt_type: 'KITCHEN',
    station_name: 'Main Kitchen',
    order_id: 9003,
    table_name: 'T05',
    items: [{ quantity: 1, name: 'Printer Failure Test' }],
  });

  const result = await runIpadPrintJob(job, {
    async printEscPos() {
      events.push(['print']);
      throw new Error('Simulated Bluetooth disconnect');
    },
    async complete(jobId, leaseToken) {
      events.push(['complete', jobId, leaseToken]);
    },
    async fail(jobId, leaseToken, error) {
      events.push(['fail', jobId, leaseToken, error]);
    },
  });

  assert(result.printed === false, 'failure case should not mark printed');
  assert(result.error === 'Simulated Bluetooth disconnect', 'failure case should preserve error');
  assert(events.length === 2, 'failure case should call print then fail');
  assert(events[0][0] === 'print', 'failure case first event should be print');
  assert(events[1][0] === 'fail', 'failure case should call fail endpoint');
  assert(events[1][1] === 3, 'failure case should fail the same job id');
  assert(events[1][2] === 'lease-token-3', 'failure case should fail with lease token');
}

await runSuccessCase();
console.log('[ipad-printer-sim] XP80T-W01 OK — leased kitchen job prints and completes');

await runCustomerReceiptCase();
console.log('[ipad-printer-sim] XP80T-W02 OK — customer receipt prints and completes');

await runFailureCase();
console.log('[ipad-printer-sim] XP80T-W03 OK — Bluetooth failure marks job failed for retry');

if (failures.length) {
  console.error('[ipad-printer-sim] failed');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('[ipad-printer-sim] all no-hardware iPad printer worker simulations passed');
