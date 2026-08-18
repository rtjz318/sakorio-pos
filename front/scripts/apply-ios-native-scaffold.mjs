import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, join } from 'node:path';

const root = process.cwd();
const checkOnly = process.argv.includes('--check-only');

const sourceFiles = [
  'native/ios-xp80t/Xp80tPrinterPlugin.swift',
  'native/ios-xp80t/Xp80tPrinterPlugin.m',
  'native/ios-secure-storage/SakorioSecureStoragePlugin.swift',
  'native/ios-secure-storage/SakorioSecureStoragePlugin.m',
];

const iosAppDir = join(root, 'ios/App/App');
const infoPlistPath = join(iosAppDir, 'Info.plist');

for (const file of sourceFiles) {
  if (!existsSync(join(root, file))) {
    console.error(`[ios-native-scaffold] missing source file: ${file}`);
    process.exit(1);
  }
}

if (!existsSync(iosAppDir)) {
  console.warn(
    '[ios-native-scaffold] ios/App/App does not exist yet. Run the Capacitor iOS generation pass first.',
  );
  console.log('[ios-native-scaffold] source scaffold OK');
  process.exit(0);
}

if (checkOnly) {
  console.log('[ios-native-scaffold] iOS app folder detected');
  console.log('[ios-native-scaffold] source scaffold OK');
  process.exit(0);
}

mkdirSync(iosAppDir, { recursive: true });
for (const file of sourceFiles) {
  const source = join(root, file);
  const target = join(iosAppDir, basename(file));
  copyFileSync(source, target);
  console.log(`[ios-native-scaffold] copied ${file} -> ${target}`);
}

if (!existsSync(infoPlistPath)) {
  console.warn('[ios-native-scaffold] Info.plist not found; add Bluetooth permission keys manually.');
  process.exit(0);
}

const originalPlist = readFileSync(infoPlistPath, 'utf8');
let plist = originalPlist;

if (!plist.includes('NSBluetoothAlwaysUsageDescription')) {
  plist = plist.replace(
    '</dict>',
    [
      '  <key>NSBluetoothAlwaysUsageDescription</key>',
      '  <string>Sakorio uses Bluetooth to connect to the restaurant XP-80T receipt printer.</string>',
      '</dict>',
    ].join('\n'),
  );
  console.log('[ios-native-scaffold] added NSBluetoothAlwaysUsageDescription');
}

if (plist !== originalPlist) {
  writeFileSync(infoPlistPath, plist);
  console.log('[ios-native-scaffold] updated Info.plist');
} else {
  console.log('[ios-native-scaffold] Info.plist already contains required keys');
}

console.log('[ios-native-scaffold] done');
