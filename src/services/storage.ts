import type { Order, Payment, Platform, Subscription, ExportedData, NotificationSettings, LimitChange } from '../types';
import { DEFAULT_PLATFORMS, DEFAULT_SUBSCRIPTIONS } from '../constants/platforms';

const DB_NAME = 'bnpl-tracker';
const DB_VERSION = 2; // Bumped for limitHistory store
const BACKUP_KEY = 'bnpl-tracker-backup';
const NOTIFICATION_SETTINGS_KEY = 'bnpl-notification-settings';
const GEMINI_API_KEY_KEY = 'bnpl-gemini-api-key';

interface DBSchema {
  orders: Order;
  payments: Payment;
  platforms: Platform;
  subscriptions: Subscription;
  limitHistory: LimitChange;
}

type StoreName = keyof DBSchema;

class StorageService {
  private db: IDBDatabase | null = null;
  private initPromise: Promise<void> | null = null;
  private isImporting: boolean = false; // Flag to prevent recursive backup restore

  // localStorage backup methods
  private saveBackup(): void {
    if (!this.db) return;

    // Get all data and save to localStorage
    this.exportData().then((data) => {
      try {
        localStorage.setItem(BACKUP_KEY, JSON.stringify(data));
        console.log('[Storage] Backup saved to localStorage');
      } catch (err) {
        // localStorage.setItem can throw QuotaExceededError
        console.error('[Storage] Backup failed - localStorage quota may be exceeded:', err);
      }
    }).catch((err) => {
      console.error('[Storage] Failed to export data for backup:', err);
    });
  }

  private getBackup(): ExportedData | null {
    try {
      const backup = localStorage.getItem(BACKUP_KEY);
      if (backup) {
        const data = JSON.parse(backup) as ExportedData;
        console.log('[Storage] Found localStorage backup from', data.exportedAt);
        return data;
      }
    } catch (err) {
      console.warn('[Storage] Failed to read backup:', err);
    }
    return null;
  }

  async init(): Promise<void> {
    if (this.db) return;
    if (this.initPromise) return this.initPromise;

    this.initPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        console.error('Failed to open IndexedDB:', request.error);
        // Fall back to localStorage
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        console.log('[Storage] IndexedDB opened successfully');
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Create orders store
        if (!db.objectStoreNames.contains('orders')) {
          const ordersStore = db.createObjectStore('orders', { keyPath: 'id' });
          ordersStore.createIndex('by-platform', 'platformId');
          ordersStore.createIndex('by-status', 'status');
          ordersStore.createIndex('by-createdAt', 'createdAt');
        }

        // Create payments store
        if (!db.objectStoreNames.contains('payments')) {
          const paymentsStore = db.createObjectStore('payments', { keyPath: 'id' });
          paymentsStore.createIndex('by-order', 'orderId');
          paymentsStore.createIndex('by-platform', 'platformId');
          paymentsStore.createIndex('by-dueDate', 'dueDate');
          paymentsStore.createIndex('by-status', 'status');
        }

        // Create platforms store
        if (!db.objectStoreNames.contains('platforms')) {
          db.createObjectStore('platforms', { keyPath: 'id' });
        }

        // Create subscriptions store
        if (!db.objectStoreNames.contains('subscriptions')) {
          const subsStore = db.createObjectStore('subscriptions', { keyPath: 'platformId' });
          subsStore.createIndex('by-active', 'isActive');
        }

        // Create limitHistory store (added in v2)
        if (!db.objectStoreNames.contains('limitHistory')) {
          const limitStore = db.createObjectStore('limitHistory', { keyPath: 'id' });
          limitStore.createIndex('by-platform', 'platformId');
          limitStore.createIndex('by-date', 'changedAt');
        }
      };
    });

    await this.initPromise;
    await this.initializeDefaults();
  }

  private async initializeDefaults(): Promise<void> {
    // Check if IndexedDB has any data
    const [orders, payments, platforms] = await Promise.all([
      this.getAll<Order>('orders'),
      this.getAll<Payment>('payments'),
      this.getAll<Platform>('platforms'),
    ]);

    // If IndexedDB is empty, try to restore from localStorage backup
    // Skip this during import to prevent recursive restore loop
    if (!this.isImporting && orders.length === 0 && payments.length === 0 && platforms.length === 0) {
      const backup = this.getBackup();
      if (backup && (backup.orders.length > 0 || backup.payments.length > 0)) {
        console.log('[Storage] IndexedDB empty, restoring from localStorage backup...');
        try {
          await this.importData(backup);
          console.log('[Storage] Restored from backup successfully');
          return;
        } catch (err) {
          console.error('[Storage] Failed to restore from backup:', err);
        }
      }
    }

    // Initialize platforms if empty
    const currentPlatforms = await this.getAll<Platform>('platforms');
    if (currentPlatforms.length === 0) {
      console.log('[Storage] Initializing default platforms');
      for (const platform of DEFAULT_PLATFORMS) {
        await this.put('platforms', platform, false); // Don't trigger backup for defaults
      }
    }

    // Initialize subscriptions if empty
    const subscriptions = await this.getAll<Subscription>('subscriptions');
    if (subscriptions.length === 0) {
      console.log('[Storage] Initializing default subscriptions');
      for (const subscription of DEFAULT_SUBSCRIPTIONS) {
        await this.put('subscriptions', subscription, false); // Don't trigger backup for defaults
      }
    }
  }

  private getStore(storeName: StoreName, mode: IDBTransactionMode = 'readonly'): IDBObjectStore {
    if (!this.db) {
      throw new Error('Database not initialized');
    }
    const transaction = this.db.transaction(storeName, mode);
    return transaction.objectStore(storeName);
  }

  async getAll<T>(storeName: StoreName): Promise<T[]> {
    await this.init();
    // Return empty array if store doesn't exist
    if (!this.db?.objectStoreNames.contains(storeName)) {
      console.warn(`[Storage] Store '${storeName}' does not exist, returning empty array`);
      return [];
    }
    return new Promise((resolve, reject) => {
      const store = this.getStore(storeName);
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async get<T>(storeName: StoreName, key: string): Promise<T | undefined> {
    await this.init();
    return new Promise((resolve, reject) => {
      const store = this.getStore(storeName);
      const request = store.get(key);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async put<T extends { id?: string; platformId?: string }>(
    storeName: StoreName,
    item: T,
    triggerBackup: boolean = true
  ): Promise<void> {
    await this.init();
    // Check if store exists (for backwards compatibility with older databases)
    if (!this.db?.objectStoreNames.contains(storeName)) {
      console.warn(`[Storage] Store '${storeName}' does not exist, skipping save`);
      return;
    }
    return new Promise((resolve, reject) => {
      const store = this.getStore(storeName, 'readwrite');
      const request = store.put(item);
      request.onsuccess = () => {
        console.log(`[Storage] Saved to ${storeName}:`, item.id || item.platformId);
        if (triggerBackup) {
          this.saveBackup();
        }
        resolve();
      };
      request.onerror = () => {
        console.error(`[Storage] Failed to save to ${storeName}:`, request.error);
        reject(request.error);
      };
    });
  }

  async delete(storeName: StoreName, key: string): Promise<void> {
    await this.init();
    return new Promise((resolve, reject) => {
      const store = this.getStore(storeName, 'readwrite');
      const request = store.delete(key);
      request.onsuccess = () => {
        console.log(`[Storage] Deleted from ${storeName}:`, key);
        this.saveBackup();
        resolve();
      };
      request.onerror = () => {
        console.error(`[Storage] Failed to delete from ${storeName}:`, request.error);
        reject(request.error);
      };
    });
  }

  async getByIndex<T>(
    storeName: StoreName,
    indexName: string,
    value: IDBValidKey
  ): Promise<T[]> {
    await this.init();
    // Return empty array if store doesn't exist
    if (!this.db?.objectStoreNames.contains(storeName)) {
      console.warn(`[Storage] Store '${storeName}' does not exist, returning empty array`);
      return [];
    }
    return new Promise((resolve, reject) => {
      const store = this.getStore(storeName);
      const index = store.index(indexName);
      const request = index.getAll(value);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  // Batch insert for better import performance
  private async batchPut<T>(
    storeName: StoreName,
    items: T[]
  ): Promise<void> {
    if (items.length === 0) return;

    await this.init();
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      // Check if the store exists before trying to access it
      if (!this.db.objectStoreNames.contains(storeName)) {
        console.warn(`[Storage] Store '${storeName}' does not exist, skipping batch insert`);
        resolve();
        return;
      }

      const transaction = this.db.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);

      transaction.oncomplete = () => {
        console.log(`[Storage] Batch inserted ${items.length} items into ${storeName}`);
        resolve();
      };
      transaction.onerror = () => {
        console.error(`[Storage] Batch insert failed for ${storeName}:`, transaction.error);
        reject(transaction.error);
      };

      for (const item of items) {
        store.put(item);
      }
    });
  }

  // Orders
  async getAllOrders(): Promise<Order[]> {
    return this.getAll<Order>('orders');
  }

  async getOrder(id: string): Promise<Order | undefined> {
    return this.get<Order>('orders', id);
  }

  async saveOrder(order: Order): Promise<void> {
    return this.put('orders', order);
  }

  async deleteOrder(id: string): Promise<void> {
    // Also delete associated payments
    const payments = await this.getPaymentsByOrder(id);
    try {
      for (const payment of payments) {
        await this.delete('payments', payment.id);
      }
      await this.delete('orders', id);
    } catch (error) {
      console.error('[Storage] deleteOrder failed:', error);
      throw error; // Re-throw so caller knows it failed
    }
  }

  async getOrdersByPlatform(platformId: string): Promise<Order[]> {
    return this.getByIndex<Order>('orders', 'by-platform', platformId);
  }

  // Payments
  async getAllPayments(): Promise<Payment[]> {
    return this.getAll<Payment>('payments');
  }

  async getPayment(id: string): Promise<Payment | undefined> {
    return this.get<Payment>('payments', id);
  }

  async savePayment(payment: Payment): Promise<void> {
    return this.put('payments', payment);
  }

  async deletePayment(id: string): Promise<void> {
    return this.delete('payments', id);
  }

  async getPaymentsByOrder(orderId: string): Promise<Payment[]> {
    return this.getByIndex<Payment>('payments', 'by-order', orderId);
  }

  async getPaymentsByPlatform(platformId: string): Promise<Payment[]> {
    return this.getByIndex<Payment>('payments', 'by-platform', platformId);
  }

  // Platforms
  async getAllPlatforms(): Promise<Platform[]> {
    return this.getAll<Platform>('platforms');
  }

  async getPlatform(id: string): Promise<Platform | undefined> {
    return this.get<Platform>('platforms', id);
  }

  async savePlatform(platform: Platform): Promise<void> {
    return this.put('platforms', platform);
  }

  // Subscriptions
  async getAllSubscriptions(): Promise<Subscription[]> {
    return this.getAll<Subscription>('subscriptions');
  }

  async getSubscription(platformId: string): Promise<Subscription | undefined> {
    return this.get<Subscription>('subscriptions', platformId);
  }

  async saveSubscription(subscription: Subscription): Promise<void> {
    return this.put('subscriptions', subscription);
  }

  // Limit History
  async getAllLimitHistory(): Promise<LimitChange[]> {
    return this.getAll<LimitChange>('limitHistory');
  }

  async saveLimitChange(change: LimitChange): Promise<void> {
    return this.put('limitHistory', change);
  }

  async getLimitHistoryByPlatform(platformId: string): Promise<LimitChange[]> {
    return this.getByIndex<LimitChange>('limitHistory', 'by-platform', platformId);
  }

  async deleteLimitChange(id: string): Promise<void> {
    return this.delete('limitHistory', id);
  }

  // Notification Settings (stored in localStorage for simplicity)
  getNotificationSettings(): NotificationSettings {
    try {
      const stored = localStorage.getItem(NOTIFICATION_SETTINGS_KEY);
      if (stored) {
        return JSON.parse(stored) as NotificationSettings;
      }
    } catch (err) {
      console.warn('[Storage] Failed to read notification settings:', err);
    }
    return {
      enabled: false,
      daysBefore: 1,
      notifyOnDueDate: true,
      notifyOverdue: true,
    };
  }

  saveNotificationSettings(settings: NotificationSettings): void {
    try {
      localStorage.setItem(NOTIFICATION_SETTINGS_KEY, JSON.stringify(settings));
      console.log('[Storage] Notification settings saved');
    } catch (err) {
      console.warn('[Storage] Failed to save notification settings:', err);
    }
  }

  // Gemini API Key (stored in localStorage)
  getGeminiApiKey(): string | null {
    try {
      return localStorage.getItem(GEMINI_API_KEY_KEY);
    } catch (err) {
      console.warn('[Storage] Failed to read Gemini API key:', err);
      return null;
    }
  }

  saveGeminiApiKey(key: string): void {
    try {
      localStorage.setItem(GEMINI_API_KEY_KEY, key);
      console.log('[Storage] Gemini API key saved');
    } catch (err) {
      console.warn('[Storage] Failed to save Gemini API key:', err);
    }
  }

  clearGeminiApiKey(): void {
    try {
      localStorage.removeItem(GEMINI_API_KEY_KEY);
      console.log('[Storage] Gemini API key cleared');
    } catch (err) {
      console.warn('[Storage] Failed to clear Gemini API key:', err);
    }
  }

  // Export/Import
  async exportData(): Promise<ExportedData> {
    const [orders, payments, platforms, subscriptions, limitHistory] = await Promise.all([
      this.getAllOrders(),
      this.getAllPayments(),
      this.getAllPlatforms(),
      this.getAllSubscriptions(),
      this.getAllLimitHistory(),
    ]);

    return {
      version: 2,
      exportedAt: new Date().toISOString(),
      orders,
      payments,
      platforms,
      subscriptions,
      limitHistory,
    };
  }

  async importData(data: ExportedData): Promise<void> {
    // Validate version - support v1 and v2
    if (data.version !== 1 && data.version !== 2) {
      throw new Error(`Unsupported data version: ${data.version}`);
    }

    // Validate required arrays
    if (!Array.isArray(data.orders)) {
      throw new Error('Invalid data: orders must be an array');
    }
    if (!Array.isArray(data.payments)) {
      throw new Error('Invalid data: payments must be an array');
    }

    // Validate referential integrity - check that all payments reference valid orders
    const orderIds = new Set(data.orders.map(o => o.id));
    const orphanedPayments = data.payments.filter(p => !orderIds.has(p.orderId));
    if (orphanedPayments.length > 0) {
      throw new Error(`Import contains ${orphanedPayments.length} payment(s) referencing non-existent orders`);
    }

    // Set flag to prevent recursive backup restore during import
    this.isImporting = true;

    try {
      // Clear existing data (backup is preserved until import succeeds)
      await this.clearAllData();

      // Use batch operations for better performance
      await this.batchPut('platforms', data.platforms || []);
      await this.batchPut('subscriptions', data.subscriptions || []);
      await this.batchPut('orders', data.orders);
      await this.batchPut('payments', data.payments);

      // Import limit history (v2+)
      if (data.limitHistory && data.limitHistory.length > 0) {
        await this.batchPut('limitHistory', data.limitHistory);
      }

      // Only clear old backup after successful import, then create new backup
      localStorage.removeItem(BACKUP_KEY);
      this.saveBackup();
    } finally {
      this.isImporting = false;
    }
  }

  async clearAllData(): Promise<void> {
    await this.init();

    const storeNames: StoreName[] = ['orders', 'payments', 'platforms', 'subscriptions', 'limitHistory'];

    for (const storeName of storeNames) {
      // Check if store exists before trying to clear it
      if (!this.db?.objectStoreNames.contains(storeName)) {
        console.warn(`[Storage] Store '${storeName}' does not exist, skipping clear`);
        continue;
      }

      await new Promise<void>((resolve, reject) => {
        const store = this.getStore(storeName, 'readwrite');
        const request = store.clear();
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    }

    // Re-initialize defaults
    await this.initializeDefaults();
  }
}

export const storage = new StorageService();

// Debug function to inspect storage state
export async function debugStorage(): Promise<void> {
  console.group('[Storage Debug]');

  // Check IndexedDB
  console.log('=== IndexedDB Contents ===');
  try {
    const [orders, payments, platforms, subscriptions, limitHistory] = await Promise.all([
      storage.getAllOrders(),
      storage.getAllPayments(),
      storage.getAllPlatforms(),
      storage.getAllSubscriptions(),
      storage.getAllLimitHistory(),
    ]);
    console.log('Orders:', orders.length, orders);
    console.log('Payments:', payments.length, payments);
    console.log('Platforms:', platforms.length, platforms);
    console.log('Subscriptions:', subscriptions.length, subscriptions);
    console.log('Limit History:', limitHistory.length, limitHistory);
  } catch (err) {
    console.error('IndexedDB error:', err);
  }

  // Check localStorage backup
  console.log('\n=== localStorage Backup ===');
  try {
    const backup = localStorage.getItem(BACKUP_KEY);
    if (backup) {
      const data = JSON.parse(backup) as ExportedData;
      console.log('Backup exists from:', data.exportedAt);
      console.log('Orders:', data.orders.length);
      console.log('Payments:', data.payments.length);
      console.log('Platforms:', data.platforms.length);
      console.log('Subscriptions:', data.subscriptions.length);
    } else {
      console.log('No backup found');
    }
  } catch (err) {
    console.error('localStorage error:', err);
  }

  console.groupEnd();
}

// Expose debug function to window for console access
if (typeof window !== 'undefined') {
  (window as unknown as { debugStorage: typeof debugStorage }).debugStorage = debugStorage;
}
