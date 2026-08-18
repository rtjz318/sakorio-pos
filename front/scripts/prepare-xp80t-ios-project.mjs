import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const checkOnly = process.argv.includes('--check-only');
const generate = process.argv.includes('--generate');
const syncOnly = process.argv.includes('--sync-only');

const failures = [];
const warnings = [];
const nextSteps = [];

function readJson(path) {
  return JSON.parse(readFileSync(join(root, path), 'utf8'));
}

function hasPackage(packageName) {
  return existsSync(join(root, 'node_modules', ...packageName.split('/')));
}

function run(command, args) {
  console.log(`[xp80t-ios-prepare] $ ${command} ${args.join(' ')}`);
  const result = spawnSync(command, args, {
    cwd: root,
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });
  if (result.status !== 0) {
    failures.push(`${command} ${args.join(' ')} failed with exit code ${result.status}`);
  }
}

const packageJson = readJson('package.json');
const dependencies = {
  ...packageJson.dependencies,
  ...packageJson.devDependencies,
};

for (const dependency of ['@capacitor/core', '@capacitor/ios']) {
  if (!dependencies[dependency]) failures.push(`${dependency} is missing from package.json`);
  if (!hasPackage(dependency)) {
    warnings.push(`${dependency} is not present in node_modules; run npm ci --ignore-scripts first.`);
  }
}

if (!dependencies['@capacitor/cli']) {
  warnings.push('@capacitor/cli is not pinned yet; add it in the dedicated Mac/iOS dependency pass.');
}
if (!hasPackage('@capacitor/cli')) {
  warnings.push('@capacitor/cli is not present in node_modules; iOS generation cannot run yet.');
}

const config = readJson('capacitor.config.json');
if (config.appId !== 'com.sakorio.pos') failures.push(`Unexpected Capacitor appId: ${config.appId}`);
if (config.appName !== 'Sakorio POS') failures.push(`Unexpected Capacitor appName: ${config.appName}`);
if (config.webDir !== 'dist/front/browser') failures.push(`Unexpected Capacitor webDir: ${config.webDir}`);

const webIndexPath = join(root, config.webDir || '', 'index.html');
const iosProjectPath = join(root, 'ios/App/App.xcodeproj');

if (!existsSync(webIndexPath)) {
  warnings.push('Built web app is missing; run npm run build -- --configuration production-static.');
  nextSteps.push('npm run build -- --configuration production-static');
}

if (!existsSync(iosProjectPath)) {
  warnings.push('Capacitor iOS project is missing.');
  nextSteps.push('npx cap add ios');
} else {
  nextSteps.push('npx cap sync ios');
}

nextSteps.push('npm run ios:apply-native-scaffold');
nextSteps.push('Open ios/App/App.xcodeproj in Xcode and test on the physical iPad + XP-80T printer.');

if (failures.length) {
  console.error('[xp80t-ios-prepare] failed');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

if (warnings.length) {
  console.warn('[xp80t-ios-prepare] warnings');
  for (const warning of warnings) console.warn(`- ${warning}`);
}

if (checkOnly) {
  console.log('[xp80t-ios-prepare] check-only OK');
  console.log('[xp80t-ios-prepare] next commands when on the Mac build machine:');
  for (const step of nextSteps) console.log(`- ${step}`);
  process.exit(0);
}

if (!hasPackage('@capacitor/cli')) {
  console.error('[xp80t-ios-prepare] cannot continue because @capacitor/cli is not installed.');
  console.error('[xp80t-ios-prepare] run check-only for the exact remaining steps.');
  process.exit(1);
}

if (!existsSync(webIndexPath)) {
  run('npm', ['run', 'build', '--', '--configuration', 'production-static']);
}

if (syncOnly || existsSync(iosProjectPath)) {
  run('npx', ['cap', 'sync', 'ios']);
} else if (generate) {
  run('npx', ['cap', 'add', 'ios']);
} else {
  console.error('[xp80t-ios-prepare] iOS project is missing.');
  console.error('[xp80t-ios-prepare] rerun with --generate on the Mac build machine to create it.');
  process.exit(1);
}

if (failures.length) {
  console.error('[xp80t-ios-prepare] failed');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

run('node', ['scripts/apply-ios-native-scaffold.mjs']);

if (failures.length) {
  console.error('[xp80t-ios-prepare] failed');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('[xp80t-ios-prepare] done');
console.log('[xp80t-ios-prepare] next: open ios/App/App.xcodeproj in Xcode and test on iPad.');
