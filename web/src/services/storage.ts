/**
 * Platform-independent Storage Abstraction
 * Supports Web LocalStorage today, and is structured for Capacitor Storage plugin during Android conversion.
 */

export interface IStorageProvider {
  getItem<T>(key: string, defaultValue: T): Promise<T>;
  setItem<T>(key: string, value: T): Promise<void>;
  removeItem(key: string): Promise<void>;
  clear(): Promise<void>;
}

class WebLocalStorageProvider implements IStorageProvider {
  async getItem<T>(key: string, defaultValue: T): Promise<T> {
    try {
      const raw = localStorage.getItem(`sitepulse_${key}`);
      if (!raw) return defaultValue;
      return JSON.parse(raw) as T;
    } catch {
      return defaultValue;
    }
  }

  async setItem<T>(key: string, value: T): Promise<void> {
    try {
      localStorage.setItem(`sitepulse_${key}`, JSON.stringify(value));
    } catch (e) {
      console.warn('LocalStorage quota or storage write failure', e);
    }
  }

  async removeItem(key: string): Promise<void> {
    localStorage.removeItem(`sitepulse_${key}`);
  }

  async clear(): Promise<void> {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith('sitepulse_')) {
        keysToRemove.push(k);
      }
    }
    keysToRemove.forEach((k) => localStorage.removeItem(k));
  }
}

export const Storage = new WebLocalStorageProvider();
