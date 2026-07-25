import { Blob as NodeBlob, File as NodeFile } from 'node:buffer';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { imageStorage } from './imageStorage';

const imageFile = (content: string, name: string): File =>
  new NodeFile([content], name, { type: 'image/png' }) as unknown as File;

describe('imageStorage', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('round-trips a Blob without converting it to a Data URL', async () => {
    const file = imageFile('pixel', 'pixel.png');

    const id = await imageStorage.save(file);
    const blob = await imageStorage.get(id);

    expect(id).toEqual(expect.any(String));
    expect(blob).toBeInstanceOf(NodeBlob);
    expect(await blob?.text()).toBe('pixel');
    expect(blob?.type).toBe('image/png');
  });

  it('returns null for an unknown ID', async () => {
    await expect(imageStorage.get('missing-image')).resolves.toBeNull();
  });

  it('keeps the old image until its replacement has been saved', async () => {
    const oldId = await imageStorage.save(imageFile('old', 'old.png'));
    const newId = await imageStorage.save(imageFile('new', 'new.png'));

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

    await expect(
      imageStorage.save(imageFile('pixel', 'pixel.png')),
    ).rejects.toBeInstanceOf(Error);
  });
});
