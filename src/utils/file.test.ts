import { describe, it, expect } from 'vitest';
import { validateImageFile } from './file';

describe('validateImageFile', () => {
  it('rejects files that are not images', () => {
    const file = new File(['hello'], 'test.txt', { type: 'text/plain' });
    expect(() => validateImageFile(file)).toThrow('Not an image file');
  });

  it('rejects files larger than 5MB', () => {
    const largeContent = new ArrayBuffer(6 * 1024 * 1024);
    const file = new File([largeContent], 'large.png', { type: 'image/png' });
    expect(() => validateImageFile(file)).toThrow('Image size exceeds 5MB limit');
  });

  it('accepts image files up to 5MB', () => {
    const content = new ArrayBuffer(5 * 1024 * 1024);
    const file = new File([content], 'large.png', { type: 'image/png' });
    expect(() => validateImageFile(file)).not.toThrow();
  });
});
