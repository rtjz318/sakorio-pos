import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const requiredFiles = [
  'capacitor.config.json',
  'native/ios-xp80t/Xp80tPrinterPlugin.swift',
  'native/ios-xp80t/Xp80tPrinterPlugin.m',
  'native/ios-xp80t/Info.plist-snippet.xml',
  'native/ios-xp80t/README.md',
  'native/ios-xp80t/SDK-INTEGRATION.md',
  'native/ios-secure-storage/SakorioSecureStoragePlugin.swift',
  'native/ios-secure-storage/SakorioSecureStoragePlugin.m',
  'native/ios-secure-storage/README.md',
  'src/app/services/native-secure-storage.service.ts',
  'src/app/services/xp80t-printer.service.ts',
  'src/app/services/ipad-printer-worker.service.ts',
  'src/app/services/escpos-receipt-renderer.ts',
];

const missing = requiredFiles.filter((file) => !existsSync(join(root, file)));
if (missing.length) {
  console.error('[xp80t-scaffold] missing files:');
  for (const file of missing) console.error(`- ${file}`);
  process.exit(1);
}

const config = JSON.parse(readFileSync(join(root, 'capacitor.config.json'), 'utf8'));
if (config.appId !== 'com.sakorio.pos') {
  console.error(`[xp80t-scaffold] unexpected appId: ${config.appId}`);
  process.exit(1);
}
if (config.webDir !== 'dist/front/browser') {
  console.error(`[xp80t-scaffold] unexpected webDir: ${config.webDir}`);
  process.exit(1);
}

const swift = readFileSync(join(root, 'native/ios-xp80t/Xp80tPrinterPlugin.swift'), 'utf8');
for (const marker of [
  'CoreBluetooth',
  'writeEscPos',
  'payloadBase64',
  'TransportMode',
  'xprinterSdk',
  'scanWithXprinterSdkIfAvailable',
  'printWithXprinterSdkIfConnected',
]) {
  if (!swift.includes(marker)) {
    console.error(`[xp80t-scaffold] Swift plugin missing marker: ${marker}`);
    process.exit(1);
  }
}

const secureStorage = readFileSync(
  join(root, 'native/ios-secure-storage/SakorioSecureStoragePlugin.swift'),
  'utf8',
);
for (const marker of ['Security', 'SecItemAdd', 'SecItemCopyMatching', 'ThisDeviceOnly']) {
  if (!secureStorage.includes(marker)) {
    console.error(`[xp80t-scaffold] Secure storage plugin missing marker: ${marker}`);
    process.exit(1);
  }
}

console.log('[xp80t-scaffold] OK');
