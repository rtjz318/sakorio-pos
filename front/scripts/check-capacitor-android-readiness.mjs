import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const strict = process.argv.includes('--strict');
const failures = [];
const warnings = [];

function requireFile(path) {
  if (!existsSync(join(root, path))) failures.push(`Missing ${path}`);
}

function warnIfMissing(path, message) {
  if (!existsSync(join(root, path))) warnings.push(message || `Missing ${path}`);
}

requireFile('capacitor.config.json');
requireFile('native/android-xp80t/Xp80tPrinterPlugin.java');
requireFile('native/android-xp80t/AndroidManifest-snippet.xml');
requireFile('native/android-xp80t/README.md');
requireFile('src/app/services/xp80t-printer.service.ts');
requireFile('src/app/services/ipad-printer-worker.service.ts');
requireFile('src/app/services/escpos-receipt-renderer.ts');

const packageJson = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
const dependencies = {
  ...packageJson.dependencies,
  ...packageJson.devDependencies,
};

for (const dependency of ['@capacitor/core', '@capacitor/cli', '@capacitor/android']) {
  if (!dependencies[dependency]) {
    warnings.push(`${dependency} is not installed yet. Add it in the dedicated Android dependency pass.`);
  }
}

const config = JSON.parse(readFileSync(join(root, 'capacitor.config.json'), 'utf8'));
if (config.appId !== 'com.sakorio.pos') failures.push(`Unexpected appId: ${config.appId}`);
if (config.appName !== 'Sakorio POS') failures.push(`Unexpected appName: ${config.appName}`);
if (config.webDir !== 'dist/front/browser') {
  failures.push(`Unexpected webDir: ${config.webDir}`);
}
if (config.server?.androidScheme !== 'https') {
  failures.push(`Unexpected androidScheme: ${config.server?.androidScheme}`);
}
if (config.server?.hostname !== 'staff.sakorio.com') {
  failures.push(`Unexpected native hostname: ${config.server?.hostname}`);
}

const java = readFileSync(join(root, 'native/android-xp80t/Xp80tPrinterPlugin.java'), 'utf8');
for (const marker of [
  '@CapacitorPlugin(',
  'name = "Xp80tPrinter"',
  'PermissionCallback',
  'BluetoothSocket',
  'SPP_UUID',
  'payloadBase64',
  'androidBluetoothSpp',
]) {
  if (!java.includes(marker)) {
    failures.push(`Android plugin missing marker: ${marker}`);
  }
}

warnIfMissing(
  'dist/front/browser/index.html',
  'Angular app shell is not built yet. Run npm run build -- --configuration production-static before npx cap sync.',
);
warnIfMissing(
  'android/app/build.gradle',
  'Capacitor Android project is not generated yet. This is expected until the Android build pass runs npx cap add android.',
);

if (failures.length) {
  console.error('[capacitor-android-readiness] failed');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

if (warnings.length) {
  console.warn('[capacitor-android-readiness] warnings');
  for (const warning of warnings) console.warn(`- ${warning}`);
  if (strict) process.exit(1);
}

console.log('[capacitor-android-readiness] OK');
