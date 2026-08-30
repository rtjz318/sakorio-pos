import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import vm from 'node:vm';
import ts from 'typescript';

const root = process.cwd();
const source = readFileSync(join(root, 'src/app/services/xp80t-printer-readiness.ts'), 'utf8');
const compiled = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2022,
  },
});

const sandbox = { exports: {}, console };
vm.createContext(sandbox);
vm.runInContext(compiled.outputText, sandbox, { filename: 'xp80t-printer-readiness.js' });

const { evaluateXp80tReadiness } = sandbox.exports;
const failures = [];

function assert(condition, message) {
  if (!condition) failures.push(message);
}

const browserMode = evaluateXp80tReadiness({
  nativeReady: false,
  bluetoothConnected: false,
  tokenConfigured: false,
  workerRunning: false,
  lastHeartbeatAt: null,
  lastPrintedJobId: null,
  lastError: null,
  secureStorageReady: false,
});
assert(browserMode.ready === false, 'browser mode should not be ready');
assert(browserMode.score === 13, `browser mode score should be 13, got ${browserMode.score}`);
assert(
  browserMode.nextAction.includes('native Android tablet app'),
  'browser mode next action should tell operator to use the Android tablet app',
);

const connectedButNotRunning = evaluateXp80tReadiness({
  nativeReady: true,
  bluetoothConnected: true,
  tokenConfigured: true,
  workerRunning: false,
  lastHeartbeatAt: null,
  lastPrintedJobId: null,
  lastError: null,
  secureStorageReady: true,
});
assert(connectedButNotRunning.ready === false, 'connected worker-off state should not be ready');
assert(
  connectedButNotRunning.nextAction.includes('Start the worker'),
  'worker-off next action should tell operator to start worker',
);

const failedWorker = evaluateXp80tReadiness({
  nativeReady: true,
  bluetoothConnected: true,
  tokenConfigured: true,
  workerRunning: true,
  lastHeartbeatAt: '2026-08-19T10:00:00.000Z',
  lastPrintedJobId: 77,
  lastError: 'Simulated Bluetooth disconnect',
  secureStorageReady: true,
});
assert(failedWorker.ready === false, 'failed worker should not be ready');
assert(
  failedWorker.items.find((item) => item.id === 'errors')?.detail ===
    'Simulated Bluetooth disconnect',
  'failed worker should surface exact error',
);

const ready = evaluateXp80tReadiness({
  nativeReady: true,
  bluetoothConnected: true,
  tokenConfigured: true,
  workerRunning: true,
  lastHeartbeatAt: '2026-08-19T10:00:00.000Z',
  lastPrintedJobId: 88,
  lastError: null,
  secureStorageReady: true,
});
assert(ready.ready === true, 'fully configured printer should be ready');
assert(ready.score === 100, `ready score should be 100, got ${ready.score}`);
assert(ready.label === 'Ready for XP-80T service', 'ready label should be launch positive');

if (failures.length) {
  console.error('[xp80t-readiness-test] failed');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('[xp80t-readiness-test] all XP-80T readiness scenarios passed');
