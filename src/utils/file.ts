const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;

export const validateImageFile = (file: File): void => {
  if (!file.type.startsWith('image/')) throw new Error('Not an image file');
  if (file.size > MAX_IMAGE_SIZE_BYTES) throw new Error('Image size exceeds 5MB limit');
};
