const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB limit

/** Read an image File as a data URL for canvas use / LocalStorage persistence. */
export const readImageAsDataUrl = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      reject(new Error('Not an image file'));
      return;
    }
    if (file.size > MAX_IMAGE_SIZE_BYTES) {
      reject(new Error('Image size exceeds 5MB limit'));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });

