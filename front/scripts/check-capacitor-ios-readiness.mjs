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
requireFile('native/ios-xp80t/Xp80tPrinterPlugin.swift');
requireFile('native/ios-xp80t/Xp80tPrinterPlugin.m');
requireFile('native/ios-secure-storage/SakorioSecureStoragePlugin.swift');
requireFile('native/ios-secure-storage/SakorioSecureStoragePlugin.m');
requireFile('src/app/services/xp80t-printer.service.ts');
requireFile('src/app/services/ipad-printer-worker.service.ts');
requireFile('src/app/services/native-secure-storage.service.ts');
requireFile('scripts/apply-ios-native-scaffold.mjs');

const packageJson = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
const dependencies = {
  ...packageJson.dependencies,
  ...packageJson.devDependencies,
};
for (const dependency of ['@capacitor/core', '@capacitor/cli', '@capacitor/ios']) {
  if (!dependencies[dependency]) {
    warnings.push(`${dependency} is not installed yet. Add it in the dedicated dependency pass.`);
  }
}

const config = JSON.parse(readFileSync(join(root, 'capacitor.config.json'), 'utf8'));
if (config.appId !== 'com.sakorio.pos') failures.push(`Unexpected appId: ${config.appId}`);
if (config.appName !== 'Sakorio POS') failures.push(`Unexpected appName: ${config.appName}`);
if (config.webDir !== 'dist/front/browser') {
  failures.push(`Unexpected webDir: ${config.webDir}`);
}

warnIfMissing(
  'dist/front/browser/index.html',
  'Angular app shell is not built yet. Run npm run build -- --configuration production-static before npx cap sync.',
);
warnIfMissing(
  'ios/App/App.xcodeproj',
  'Capacitor iOS project is not generated yet. This is expected until the Mac/Xcode pass runs npx cap add ios.',
);

if (failures.length) {
  console.error('[capacitor-ios-readiness] failed');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

if (warnings.length) {
  console.warn('[capacitor-ios-readiness] warnings');
  for (const warning of warnings) console.warn(`- ${warning}`);
  if (strict) process.exit(1);
}

console.log('[capacitor-ios-readiness] OK');
