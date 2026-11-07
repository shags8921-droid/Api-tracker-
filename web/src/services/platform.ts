/**
 * Platform Adapter Abstraction Layer for SitePulse AI — Phase 7 Native Android & Web
 * Supports runtime auto-detection of Capacitor native environment:
 * - When running in Native Capacitor Android: delegates to @capacitor/preferences,
 *   @capacitor/network, and @capacitor/app.
 * - When running in Standard Web browser: delegates to sessionStorage, localStorage,
 *   standard browser events, and custom listeners.
 */

import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';
import { Network } from '@capacitor/network';
import { App as CapApp } from '@capacitor/app';

export interface IAuthAdapter {
  getStoredToken(): Promise<string | null>;
  setStoredToken(token: string): Promise<void>;
  clearStoredToken(): Promise<void>;
  isSessionExpired(): Promise<boolean>;
}

export interface ISecureStorageAdapter {
  getItem<T>(key: string, defaultValue: T): Promise<T>;
  setItem<T>(key: string, value: T): Promise<void>;
  removeItem(key: string): Promise<void>;
  clear(): Promise<void>;
}

export interface IFileHandlerAdapter {
  saveFile(filename: string, content: string | Blob, mimeType: string): Promise<boolean>;
  readFile(file: File): Promise<string>;
}

export interface INetworkMonitoringAdapter {
  isOnline(): boolean;
  addListener(callback: (online: boolean) => void): () => void;
}

export interface INotificationAdapter {
  showToast(message: string, type?: 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR'): void;
  requestPermission(): Promise<boolean>;
}

export interface IBackgroundSyncAdapter {
  schedulePeriodicSync(intervalMinutes: number): Promise<void>;
  cancelPeriodicSync(): Promise<void>;
}

// -------------------------------------------------------------
// Universal Hybrid Storage & Auth Adapter (Capacitor + Web fallback)
// -------------------------------------------------------------

export class HybridAuthAdapter implements IAuthAdapter {
  private key = 'sitepulse_auth_token';

  async getStoredToken(): Promise<string | null> {
    if (Capacitor.isNativePlatform()) {
      try {
        const { value } = await Preferences.get({ key: this.key });
        return value;
      } catch {
        return null;
      }
    }
    try {
      return sessionStorage.getItem(this.key);
    } catch {
      return null;
    }
  }

  async setStoredToken(token: string): Promise<void> {
    if (Capacitor.isNativePlatform()) {
      await Preferences.set({ key: this.key, value: token });
      return;
    }
    try {
      sessionStorage.setItem(this.key, token);
    } catch (e) {
      console.warn('SessionStorage unavailable');
    }
  }

  async clearStoredToken(): Promise<void> {
    if (Capacitor.isNativePlatform()) {
      await Preferences.remove({ key: this.key });
      return;
    }
    try {
      sessionStorage.removeItem(this.key);
    } catch {
      // ignore
    }
  }

  async isSessionExpired(): Promise<boolean> {
    const token = await this.getStoredToken();
    return !token || token.length < 10;
  }
}

export class HybridSecureStorageAdapter implements ISecureStorageAdapter {
  async getItem<T>(key: string, defaultValue: T): Promise<T> {
    if (Capacitor.isNativePlatform()) {
      try {
        const { value } = await Preferences.get({ key: `sp_${key}` });
        return value ? JSON.parse(value) : defaultValue;
      } catch {
        return defaultValue;
      }
    }
    try {
      const raw = localStorage.getItem(`sp_${key}`);
      return raw ? JSON.parse(raw) : defaultValue;
    } catch {
      return defaultValue;
    }
  }

  async setItem<T>(key: string, value: T): Promise<void> {
    if (Capacitor.isNativePlatform()) {
      await Preferences.set({ key: `sp_${key}`, value: JSON.stringify(value) });
      return;
    }
    try {
      localStorage.setItem(`sp_${key}`, JSON.stringify(value));
    } catch (e) {
      console.warn('Storage quota exceeded or unavailable', e);
    }
  }

  async removeItem(key: string): Promise<void> {
    if (Capacitor.isNativePlatform()) {
      await Preferences.remove({ key: `sp_${key}` });
      return;
    }
    localStorage.removeItem(`sp_${key}`);
  }

  async clear(): Promise<void> {
    if (Capacitor.isNativePlatform()) {
      await Preferences.clear();
      return;
    }
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k?.startsWith('sp_')) keysToRemove.push(k);
    }
    keysToRemove.forEach((k) => localStorage.removeItem(k));
  }
}

export class WebFileHandlerAdapter implements IFileHandlerAdapter {
  async saveFile(filename: string, content: string | Blob, mimeType: string): Promise<boolean> {
    try {
      const blob = typeof content === 'string' ? new Blob([content], { type: mimeType }) : content;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      return true;
    } catch (e) {
      console.error('File download failed:', e);
      return false;
    }
  }

  async readFile(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(reader.error);
      reader.readAsText(file);
    });
  }
}

export class HybridNetworkMonitoringAdapter implements INetworkMonitoringAdapter {
  private onlineStatus = true;

  constructor() {
    if (typeof navigator !== 'undefined') {
      this.onlineStatus = navigator.onLine;
    }
  }

  isOnline(): boolean {
    return this.onlineStatus;
  }

  addListener(callback: (online: boolean) => void): () => void {
    if (Capacitor.isNativePlatform()) {
      const handle = Network.addListener('networkStatusChange', (status) => {
        this.onlineStatus = status.connected;
        callback(status.connected);
      });
      return () => {
        handle.then((h) => h.remove());
      };
    }

    const onOnline = () => {
      this.onlineStatus = true;
      callback(true);
    };
    const onOffline = () => {
      this.onlineStatus = false;
      callback(false);
    };

    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);

    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }
}

export class WebNotificationAdapter implements INotificationAdapter {
  private listener?: (msg: string, type: string) => void;

  setToastListener(cb: (msg: string, type: string) => void) {
    this.listener = cb;
  }

  showToast(message: string, type: 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR' = 'INFO'): void {
    if (this.listener) {
      this.listener(message, type);
    } else {
      console.log(`[Notification ${type}] ${message}`);
    }
  }

  async requestPermission(): Promise<boolean> {
    if (typeof Notification === 'undefined') return false;
    const res = await Notification.requestPermission();
    return res === 'granted';
  }
}

export class WebBackgroundSyncAdapter implements IBackgroundSyncAdapter {
  private timerId: any = null;

  async schedulePeriodicSync(intervalMinutes: number): Promise<void> {
    if (this.timerId) clearInterval(this.timerId);
    this.timerId = setInterval(() => {
      window.dispatchEvent(new CustomEvent('sitepulse:periodic_sync'));
    }, intervalMinutes * 60 * 1000);
  }

  async cancelPeriodicSync(): Promise<void> {
    if (this.timerId) {
      clearInterval(this.timerId);
      this.timerId = null;
    }
  }
}

// Global Platform Context Container
export class PlatformAdapterRegistry {
  private static instance: PlatformAdapterRegistry;

  public auth: IAuthAdapter = new HybridAuthAdapter();
  public storage: ISecureStorageAdapter = new HybridSecureStorageAdapter();
  public fileHandler: IFileHandlerAdapter = new WebFileHandlerAdapter();
  public network: INetworkMonitoringAdapter = new HybridNetworkMonitoringAdapter();
  public notification: INotificationAdapter = new WebNotificationAdapter();
  public backgroundSync: IBackgroundSyncAdapter = new WebBackgroundSyncAdapter();

  static getInstance(): PlatformAdapterRegistry {
    if (!PlatformAdapterRegistry.instance) {
      PlatformAdapterRegistry.instance = new PlatformAdapterRegistry();
    }
    return PlatformAdapterRegistry.instance;
  }
}

export const platform = PlatformAdapterRegistry.getInstance();
