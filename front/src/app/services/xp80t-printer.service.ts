import { Injectable, signal } from '@angular/core';

export type EscPosPrinterVendor = 'epson' | 'xprinter' | 'generic';

export interface BluetoothEscPosPrinterDevice {
  id: string;
  name: string;
  rssi?: number;
  vendor?: EscPosPrinterVendor;
  protocol?: 'escpos';
  transport?: 'androidBluetoothSpp';
}

export interface BluetoothEscPosPrinterStatus {
  available: boolean;
  connected: boolean;
  deviceName?: string;
  vendor?: EscPosPrinterVendor;
  protocol?: 'escpos';
  transport?: string;
  error?: string;
}

// Backwards-compatible type names for integrations compiled against the
// original XPrinter-only service.
export type Xp80tPrinterDevice = BluetoothEscPosPrinterDevice;
export type Xp80tPrinterStatus = BluetoothEscPosPrinterStatus;

interface Xp80tPrinterPlugin {
  requestPermissions(): Promise<{ bluetooth: 'granted' | 'denied' | 'prompt' }>;
  scan(): Promise<{ devices: BluetoothEscPosPrinterDevice[] }>;
  connect(options: { deviceId: string }): Promise<{
    connected: boolean;
    deviceName?: string;
    vendor?: EscPosPrinterVendor;
    protocol?: 'escpos';
    transport?: string;
  }>;
  disconnect(): Promise<void>;
  print(options: { jobId: number; payloadBase64: string }): Promise<{ printed: boolean }>;
  getStatus(): Promise<{
    connected: boolean;
    deviceName?: string;
    vendor?: EscPosPrinterVendor;
    protocol?: 'escpos';
    transport?: string;
  }>;
}

declare global {
  interface Window {
    Capacitor?: {
      isNativePlatform?: () => boolean;
      Plugins?: Record<string, unknown>;
    };
  }
}

@Injectable({ providedIn: 'root' })
export class Xp80tPrinterService {
  readonly status = signal<BluetoothEscPosPrinterStatus>({
    available: false,
    connected: false,
  });

  get isNativeAvailable(): boolean {
    return Boolean(window.Capacitor?.isNativePlatform?.() && this.plugin);
  }

  private get plugin(): Xp80tPrinterPlugin | undefined {
    return (window.Capacitor?.Plugins as { Xp80tPrinter?: Xp80tPrinterPlugin } | undefined)
      ?.Xp80tPrinter;
  }

  async refreshStatus(): Promise<BluetoothEscPosPrinterStatus> {
    if (!this.plugin) {
      const status = {
        available: false,
        connected: false,
        error: 'Bluetooth ESC/POS printer plugin is not available in this build.',
      };
      this.status.set(status);
      return status;
    }
    try {
      const result = await this.plugin.getStatus();
      const status = {
        available: true,
        connected: result.connected,
        deviceName: result.deviceName,
        vendor: result.vendor,
        protocol: result.protocol,
        transport: result.transport,
      };
      this.status.set(status);
      return status;
    } catch (error) {
      const status = {
        available: true,
        connected: false,
        error: error instanceof Error ? error.message : 'Printer status check failed.',
      };
      this.status.set(status);
      return status;
    }
  }

  async requestPermissions(): Promise<boolean> {
    if (!this.plugin) return false;
    const result = await this.plugin.requestPermissions();
    return result.bluetooth === 'granted';
  }

  async scan(): Promise<BluetoothEscPosPrinterDevice[]> {
    if (!this.plugin) return [];
    const result = await this.plugin.scan();
    return result.devices;
  }

  async connect(deviceId: string): Promise<BluetoothEscPosPrinterStatus> {
    if (!this.plugin) {
      const status = {
        available: false,
        connected: false,
        error: 'Bluetooth ESC/POS printer plugin is not available in this build.',
      };
      this.status.set(status);
      return status;
    }
    const result = await this.plugin.connect({ deviceId });
    const status = {
      available: true,
      connected: result.connected,
      deviceName: result.deviceName,
      vendor: result.vendor,
      protocol: result.protocol,
      transport: result.transport,
    };
    this.status.set(status);
    return status;
  }

  async printEscPos(jobId: number, bytes: Uint8Array): Promise<void> {
    if (!this.plugin) {
      throw new Error('Bluetooth ESC/POS printer plugin is not available in this build.');
    }
    const result = await this.plugin.print({
      jobId,
      payloadBase64: bytesToBase64(bytes),
    });
    if (!result.printed) {
      throw new Error('ESC/POS printer did not confirm print completion.');
    }
  }
}

export function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  const chunkSize = 0x8000;
  for (let index = 0; index < bytes.length; index += chunkSize) {
    const chunk = bytes.subarray(index, index + chunkSize);
    binary += String.fromCharCode(...chunk);
  }
  return btoa(binary);
}
