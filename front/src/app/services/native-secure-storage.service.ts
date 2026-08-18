import { Injectable, signal } from '@angular/core';

interface SakorioSecureStoragePlugin {
  get(options: { key: string }): Promise<{ value: string | null }>;
  set(options: { key: string; value: string }): Promise<void>;
  remove(options: { key: string }): Promise<void>;
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
export class NativeSecureStorageService {
  readonly available = signal(false);
  readonly lastError = signal<string | null>(null);

  get isNativeAvailable(): boolean {
    return Boolean(window.Capacitor?.isNativePlatform?.() && this.plugin);
  }

  private get plugin(): SakorioSecureStoragePlugin | undefined {
    return (
      window.Capacitor?.Plugins as { SakorioSecureStorage?: SakorioSecureStoragePlugin } | undefined
    )?.SakorioSecureStorage;
  }

  refreshAvailability(): boolean {
    const available = this.isNativeAvailable;
    this.available.set(available);
    if (!available) {
      this.lastError.set('Native secure storage is not available in this build.');
    } else {
      this.lastError.set(null);
    }
    return available;
  }

  async get(key: string): Promise<string | null> {
    if (!this.plugin) {
      this.lastError.set('Native secure storage is not available in this build.');
      return null;
    }
    try {
      const result = await this.plugin.get({ key });
      this.lastError.set(null);
      return result.value;
    } catch (error) {
      this.lastError.set(errorMessage(error, 'Could not read secure storage.'));
      return null;
    }
  }

  async set(key: string, value: string): Promise<boolean> {
    if (!this.plugin) {
      this.lastError.set('Native secure storage is not available in this build.');
      return false;
    }
    try {
      await this.plugin.set({ key, value });
      this.lastError.set(null);
      return true;
    } catch (error) {
      this.lastError.set(errorMessage(error, 'Could not write secure storage.'));
      return false;
    }
  }

  async remove(key: string): Promise<boolean> {
    if (!this.plugin) {
      this.lastError.set('Native secure storage is not available in this build.');
      return false;
    }
    try {
      await this.plugin.remove({ key });
      this.lastError.set(null);
      return true;
    } catch (error) {
      this.lastError.set(errorMessage(error, 'Could not clear secure storage.'));
      return false;
    }
  }
}

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}
