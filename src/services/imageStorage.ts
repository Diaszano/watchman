import { validateImageFile } from '@/utils/file';

const DATABASE_NAME = 'watchman-assets';
const DATABASE_VERSION = 1;
const STORE_NAME = 'images';

interface StoredImage {
  id: string;
  blob: Blob;
}

let databasePromise: Promise<IDBDatabase> | null = null;

const toError = (error: unknown): Error =>
  error instanceof Error ? error : new Error('Image storage failed');

const openDatabase = (): Promise<IDBDatabase> => {
  if (databasePromise) return databasePromise;

  const openingPromise = new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE_NAME)) {
        request.result.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(toError(request.error));
  });
  databasePromise = openingPromise.catch((error: unknown) => {
    databasePromise = null;
    throw error;
  });

  return databasePromise;
};

const runTransaction = async <T>(
  mode: IDBTransactionMode,
  operation: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> => {
  const database = await openDatabase();

  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, mode);
    const request = operation(transaction.objectStore(STORE_NAME));
    let result: T;

    request.onsuccess = () => {
      result = request.result;
    };
    request.onerror = () => reject(toError(request.error));
    transaction.oncomplete = () => resolve(result);
    transaction.onerror = () => reject(transaction.error ?? new Error('Image storage failed'));
    transaction.onabort = () => reject(transaction.error ?? new Error('Image storage failed'));
  });
};

export const imageStorage = {
  async save(file: File): Promise<string> {
    validateImageFile(file);
    const id = crypto.randomUUID();
    await runTransaction('readwrite', (store) =>
      store.put({ id, blob: file } satisfies StoredImage),
    );
    return id;
  },

  async get(id: string): Promise<Blob | null> {
    const record = await runTransaction<StoredImage | undefined>('readonly', (store) =>
      store.get(id),
    );
    return record?.blob ?? null;
  },

  async remove(id: string): Promise<void> {
    await runTransaction('readwrite', (store) => store.delete(id));
  },
};
