import { describe, it, expect } from 'vitest';
import { readImageAsDataUrl } from './file';

describe('readImageAsDataUrl', () => {
  it('rejects files that are not images', async () => {
    const file = new File(['hello'], 'test.txt', { type: 'text/plain' });
    await expect(readImageAsDataUrl(file)).rejects.toThrow('Not an image file');
  });

  it('rejects files larger than 5MB', async () => {
    const largeContent = new ArrayBuffer(6 * 1024 * 1024);
    const file = new File([largeContent], 'large.png', { type: 'image/png' });
    await expect(readImageAsDataUrl(file)).rejects.toThrow('Image size exceeds 5MB limit');
  });
});
