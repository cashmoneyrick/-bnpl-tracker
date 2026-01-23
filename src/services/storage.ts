import type { Order, Payment, Platform, Subscription, ExportedData } from '../types';
import { DEFAULT_PLATFORMS, DEFAULT_SUBSCRIPTIONS } from '../constants/platforms';

const DB_NAME = 'bnpl-tracker';
const DB_VERSION = 1;

interface DBSchema {
  orders: Order;
  payments: Payment;
  platforms: Platform;
  subscriptions: Subscription;
}

type StoreName = keyof DBSchema;

class StorageService {
  private db: IDBDatabase | null = null;
  private initPromise: Promise<void> | null = null;

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
      };
    });

    await this.initPromise;
    await this.initializeDefaults();
  }

  private async initializeDefaults(): Promise<void> {
    // Initialize platforms if empty
    const platforms = await this.getAll<Platform>('platforms');
    if (platforms.length === 0) {
      for (const platform of DEFAULT_PLATFORMS) {
        await this.put('platforms', platform);
      }
    }

    // Initialize subscriptions if empty
    const subscriptions = await this.getAll<Subscription>('subscriptions');
    if (subscriptions.length === 0) {
      for (const subscription of DEFAULT_SUBSCRIPTIONS) {
        await this.put('subscriptions', subscription);
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
    item: T
  ): Promise<void> {
    await this.init();
    return new Promise((resolve, reject) => {
      const store = this.getStore(storeName, 'readwrite');
      const request = store.put(item);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async delete(storeName: StoreName, key: string): Promise<void> {
    await this.init();
    return new Promise((resolve, reject) => {
      const store = this.getStore(storeName, 'readwrite');
      const request = store.delete(key);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getByIndex<T>(
    storeName: StoreName,
    indexName: string,
    value: IDBValidKey
  ): Promise<T[]> {
    await this.init();
    return new Promise((resolve, reject) => {
      const store = this.getStore(storeName);
      const index = store.index(indexName);
      const request = index.getAll(value);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
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
    for (const payment of payments) {
      await this.delete('payments', payment.id);
    }
    return this.delete('orders', id);
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

  // Export/Import
  async exportData(): Promise<ExportedData> {
    const [orders, payments, platforms, subscriptions] = await Promise.all([
      this.getAllOrders(),
      this.getAllPayments(),
      this.getAllPlatforms(),
      this.getAllSubscriptions(),
    ]);

    return {
      version: 1,
      exportedAt: new Date().toISOString(),
      orders,
      payments,
      platforms,
      subscriptions,
    };
  }

  async importData(data: ExportedData): Promise<void> {
    // Validate version
    if (data.version !== 1) {
      throw new Error(`Unsupported data version: ${data.version}`);
    }

    // Clear existing data
    await this.clearAllData();

    // Import platforms first
    for (const platform of data.platforms) {
      await this.savePlatform(platform);
    }

    // Import subscriptions
    for (const subscription of data.subscriptions) {
      await this.saveSubscription(subscription);
    }

    // Import orders
    for (const order of data.orders) {
      await this.saveOrder(order);
    }

    // Import payments
    for (const payment of data.payments) {
      await this.savePayment(payment);
    }
  }

  async clearAllData(): Promise<void> {
    await this.init();

    const storeNames: StoreName[] = ['orders', 'payments', 'platforms', 'subscriptions'];

    for (const storeName of storeNames) {
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
