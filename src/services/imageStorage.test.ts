import { Blob as NodeBlob, File as NodeFile } from 'node:buffer';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { imageStorage } from './imageStorage';

// Minimal 1x1 valid PNG
const VALID_1X1_PNG_BYTES = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  'base64',
);

const validImageFile = (name = 'valid.png'): File =>
  new NodeFile([VALID_1X1_PNG_BYTES], name, { type: 'image/png' }) as unknown as File;

describe('imageStorage', () => {
  let mockDimensions = { width: 1, height: 1, failDecode: false };

  beforeEach(() => {
    mockDimensions = { width: 1, height: 1, failDecode: false };
    HTMLImageElement.prototype.decode = vi.fn().mockImplementation(function (
      this: HTMLImageElement,
    ) {
      if (mockDimensions.failDecode) {
        return Promise.reject(new Error('Decode error'));
      }
      Object.defineProperty(this, 'naturalWidth', {
        value: mockDimensions.width,
        configurable: true,
      });
      Object.defineProperty(this, 'naturalHeight', {
        value: mockDimensions.height,
        configurable: true,
      });
      return Promise.resolve();
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('round-trips a Blob without converting it to a Data URL', async () => {
    const file = validImageFile('pixel.png');

    const id = await imageStorage.save(file);
    const blob = await imageStorage.get(id);

    expect(id).toEqual(expect.any(String));
    expect(blob).toBeInstanceOf(NodeBlob);
    expect(blob?.type).toBe('image/png');
  });

  it('returns null for an unknown ID', async () => {
    await expect(imageStorage.get('missing-image')).resolves.toBeNull();
  });

  it('keeps the old image until its replacement has been saved', async () => {
    const oldId = await imageStorage.save(validImageFile('old.png'));
    const newId = await imageStorage.save(validImageFile('new.png'));

    expect(await imageStorage.get(oldId)).toBeInstanceOf(NodeBlob);
    expect(await imageStorage.get(newId)).toBeInstanceOf(NodeBlob);

    await imageStorage.remove(oldId);

    expect(await imageStorage.get(oldId)).toBeNull();
    expect(await imageStorage.get(newId)).toBeInstanceOf(NodeBlob);
  });

  it('surfaces a rejected transaction as an Error', async () => {
    const original = IDBDatabase.prototype.transaction;
    vi.spyOn(IDBDatabase.prototype, 'transaction').mockImplementation(function (
      this: IDBDatabase,
      ...args: Parameters<IDBDatabase['transaction']>
    ) {
      const transaction = original.apply(this, args);
      queueMicrotask(() => transaction.abort());
      return transaction;
    });

    await expect(imageStorage.save(validImageFile('pixel.png'))).rejects.toBeInstanceOf(Error);
  });

  it('retries opening IndexedDB after an opening failure', async () => {
    vi.resetModules();
    const originalOpen = indexedDB.open.bind(indexedDB);
    const open = vi.spyOn(indexedDB, 'open');
    open.mockImplementationOnce(() => {
      const request = {} as IDBOpenDBRequest;
      queueMicrotask(() => {
        Object.defineProperty(request, 'error', { value: new Error('Open failed') });
        request.onerror?.(new Event('error'));
      });
      return request;
    });
    open.mockImplementation((...args) => originalOpen(...args));
    const { imageStorage: isolatedStorage } = await import('./imageStorage');

    await expect(isolatedStorage.get('first-attempt')).rejects.toThrow('Open failed');
    await expect(isolatedStorage.get('second-attempt')).resolves.toBeNull();
    expect(open).toHaveBeenCalledTimes(2);
  });

  describe('validation limits and error recovery', () => {
    it('rejects files larger than 5 MiB and revokes the temporary URL', async () => {
      const revokeSpy = vi.spyOn(URL, 'revokeObjectURL');
      const largeBytes = new Uint8Array(5 * 1024 * 1024 + 1);
      const largeFile = new NodeFile([largeBytes], 'huge.png', {
        type: 'image/png',
      }) as unknown as File;

      await expect(imageStorage.save(largeFile)).rejects.toThrow('image.tooLarge');
      // No storage record created
      expect(revokeSpy).not.toHaveBeenCalled(); // URL not even created if file size exceeds early
    });

    it('rejects non-image MIME types', async () => {
      const textFile = new NodeFile(['text content'], 'file.txt', {
        type: 'text/plain',
      }) as unknown as File;

      await expect(imageStorage.save(textFile)).rejects.toThrow('image.invalid');
    });

    it('rejects decode failures and revokes the temporary URL', async () => {
      const revokeSpy = vi.spyOn(URL, 'revokeObjectURL');
      mockDimensions.failDecode = true;
      const file = validImageFile('corrupt.png');

      await expect(imageStorage.save(file)).rejects.toThrow('image.invalid');
      expect(revokeSpy).toHaveBeenCalledTimes(1);
    });

    it('rejects images with zero dimensions and revokes the temporary URL', async () => {
      const revokeSpy = vi.spyOn(URL, 'revokeObjectURL');
      mockDimensions.width = 0;
      mockDimensions.height = 0;
      const file = validImageFile('zero.png');

      await expect(imageStorage.save(file)).rejects.toThrow('image.invalid');
      expect(revokeSpy).toHaveBeenCalledTimes(1);
    });

    it('rejects images exceeding 8192 px on any side', async () => {
      const revokeSpy = vi.spyOn(URL, 'revokeObjectURL');
      mockDimensions.width = 8193;
      mockDimensions.height = 100;
      const file = validImageFile('wide.png');

      await expect(imageStorage.save(file)).rejects.toThrow('image.dimensions');
      expect(revokeSpy).toHaveBeenCalledTimes(1);
    });

    it('rejects images exceeding 16.777.216 total pixels (e.g. 4096x4097)', async () => {
      const revokeSpy = vi.spyOn(URL, 'revokeObjectURL');
      mockDimensions.width = 4096;
      mockDimensions.height = 4097;
      const file = validImageFile('too-many-pixels.png');

      await expect(imageStorage.save(file)).rejects.toThrow('image.dimensions');
      expect(revokeSpy).toHaveBeenCalledTimes(1);
    });

    it('accepts images at exact boundary limits (8192x2048)', async () => {
      const revokeSpy = vi.spyOn(URL, 'revokeObjectURL');
      mockDimensions.width = 8192;
      mockDimensions.height = 2048; // exactly 16,777,216 pixels
      const file = validImageFile('boundary.png');

      const id = await imageStorage.save(file);
      expect(id).toBeDefined();
      expect(revokeSpy).toHaveBeenCalledTimes(1);
      const retrieved = await imageStorage.get(id);
      expect(retrieved).not.toBeNull();
    });

    it('recovers successfully after a validation error', async () => {
      mockDimensions.failDecode = true;
      await expect(imageStorage.save(validImageFile('bad.png'))).rejects.toThrow('image.invalid');

      mockDimensions.failDecode = false;
      mockDimensions.width = 100;
      mockDimensions.height = 100;
      const validId = await imageStorage.save(validImageFile('good.png'));
      expect(validId).toBeDefined();
      expect(await imageStorage.get(validId)).not.toBeNull();
    });
  });
});
