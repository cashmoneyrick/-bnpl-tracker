import type { CanvasDocument } from '../types/canvas';
import { DEFAULT_GRID_SETTINGS, DEFAULT_VIEWPORT } from '../types/canvas';

const DB_NAME = 'bnpl-tracker-canvas';
const DB_VERSION = 1;
const CANVAS_BACKUP_KEY = 'canvas-documents-backup';

class CanvasStorageService {
  private db: IDBDatabase | null = null;
  private initPromise: Promise<void> | null = null;

  // localStorage backup
  private saveBackup(documents: CanvasDocument[]): void {
    try {
      const backup = {
        version: 1,
        exportedAt: new Date().toISOString(),
        documents,
      };
      localStorage.setItem(CANVAS_BACKUP_KEY, JSON.stringify(backup));
      console.log('[CanvasStorage] Backup saved to localStorage');
    } catch (err) {
      console.warn('[CanvasStorage] localStorage backup failed:', err);
    }
  }

  private getBackup(): CanvasDocument[] | null {
    try {
      const backup = localStorage.getItem(CANVAS_BACKUP_KEY);
      if (backup) {
        const data = JSON.parse(backup) as { version: number; documents: CanvasDocument[] };
        console.log('[CanvasStorage] Found localStorage backup from', data.version);
        return data.documents;
      }
    } catch (err) {
      console.warn('[CanvasStorage] Failed to read backup:', err);
    }
    return null;
  }

  async init(): Promise<void> {
    if (this.db) return;
    if (this.initPromise) return this.initPromise;

    this.initPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        console.error('[CanvasStorage] Failed to open IndexedDB:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        console.log('[CanvasStorage] IndexedDB opened successfully');
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Canvas documents store
        if (!db.objectStoreNames.contains('canvasDocuments')) {
          const docStore = db.createObjectStore('canvasDocuments', { keyPath: 'id' });
          docStore.createIndex('by-name', 'name');
          docStore.createIndex('by-updatedAt', 'updatedAt');
        }

        // Image blobs store (for uploaded images)
        if (!db.objectStoreNames.contains('canvasImages')) {
          db.createObjectStore('canvasImages', { keyPath: 'id' });
        }
      };
    });

    await this.initPromise;
    await this.initializeIfEmpty();
  }

  private async initializeIfEmpty(): Promise<void> {
    const documents = await this.getAllDocuments();

    // If empty, try to restore from backup
    if (documents.length === 0) {
      const backup = this.getBackup();
      if (backup && backup.length > 0) {
        console.log('[CanvasStorage] Restoring from backup...');
        for (const doc of backup) {
          await this.saveDocument(doc, false);
        }
        return;
      }

      // Create a default document
      const defaultDoc = this.createDefaultDocument('Untitled Canvas');
      await this.saveDocument(defaultDoc, false);
      console.log('[CanvasStorage] Created default canvas document');
    }
  }

  createDefaultDocument(name: string): CanvasDocument {
    const now = new Date().toISOString();
    return {
      id: crypto.randomUUID(),
      name,
      elements: [],
      viewport: { ...DEFAULT_VIEWPORT },
      gridSettings: { ...DEFAULT_GRID_SETTINGS },
      backgroundColor: '#0a0a0a',
      createdAt: now,
      updatedAt: now,
    };
  }

  // Document CRUD operations
  async getAllDocuments(): Promise<CanvasDocument[]> {
    await this.init();
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }
      const transaction = this.db.transaction('canvasDocuments', 'readonly');
      const store = transaction.objectStore('canvasDocuments');
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async getDocument(id: string): Promise<CanvasDocument | undefined> {
    await this.init();
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }
      const transaction = this.db.transaction('canvasDocuments', 'readonly');
      const store = transaction.objectStore('canvasDocuments');
      const request = store.get(id);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async saveDocument(document: CanvasDocument, triggerBackup: boolean = true): Promise<void> {
    await this.init();
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }
      const transaction = this.db.transaction('canvasDocuments', 'readwrite');
      const store = transaction.objectStore('canvasDocuments');
      const request = store.put(document);
      request.onsuccess = async () => {
        console.log('[CanvasStorage] Document saved:', document.id);
        if (triggerBackup) {
          const allDocs = await this.getAllDocuments();
          this.saveBackup(allDocs);
        }
        resolve();
      };
      request.onerror = () => {
        console.error('[CanvasStorage] Failed to save document:', request.error);
        reject(request.error);
      };
    });
  }

  async deleteDocument(id: string): Promise<void> {
    await this.init();
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }
      const transaction = this.db.transaction('canvasDocuments', 'readwrite');
      const store = transaction.objectStore('canvasDocuments');
      const request = store.delete(id);
      request.onsuccess = async () => {
        console.log('[CanvasStorage] Document deleted:', id);
        const allDocs = await this.getAllDocuments();
        this.saveBackup(allDocs);
        resolve();
      };
      request.onerror = () => {
        console.error('[CanvasStorage] Failed to delete document:', request.error);
        reject(request.error);
      };
    });
  }

  // Image blob storage
  async saveImageBlob(id: string, blob: Blob): Promise<void> {
    await this.init();
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }
      const transaction = this.db.transaction('canvasImages', 'readwrite');
      const store = transaction.objectStore('canvasImages');
      const request = store.put({ id, blob, createdAt: new Date().toISOString() });
      request.onsuccess = () => {
        console.log('[CanvasStorage] Image saved:', id);
        resolve();
      };
      request.onerror = () => {
        console.error('[CanvasStorage] Failed to save image:', request.error);
        reject(request.error);
      };
    });
  }

  async getImageBlob(id: string): Promise<Blob | undefined> {
    await this.init();
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }
      const transaction = this.db.transaction('canvasImages', 'readonly');
      const store = transaction.objectStore('canvasImages');
      const request = store.get(id);
      request.onsuccess = () => {
        resolve(request.result?.blob);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async deleteImageBlob(id: string): Promise<void> {
    await this.init();
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }
      const transaction = this.db.transaction('canvasImages', 'readwrite');
      const store = transaction.objectStore('canvasImages');
      const request = store.delete(id);
      request.onsuccess = () => {
        console.log('[CanvasStorage] Image deleted:', id);
        resolve();
      };
      request.onerror = () => reject(request.error);
    });
  }

  // Clear all canvas data
  async clearAll(): Promise<void> {
    await this.init();
    if (!this.db) return;

    const transaction = this.db.transaction(['canvasDocuments', 'canvasImages'], 'readwrite');

    await Promise.all([
      new Promise<void>((resolve, reject) => {
        const request = transaction.objectStore('canvasDocuments').clear();
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      }),
      new Promise<void>((resolve, reject) => {
        const request = transaction.objectStore('canvasImages').clear();
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      }),
    ]);

    localStorage.removeItem(CANVAS_BACKUP_KEY);
    console.log('[CanvasStorage] All data cleared');
  }
}

export const canvasStorage = new CanvasStorageService();
