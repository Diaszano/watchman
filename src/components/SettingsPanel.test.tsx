import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { imageStorage } from '@/services/imageStorage';
import { defaultSettings, useSettings } from '@/stores/settingsStore';
import { SettingsPanel } from './SettingsPanel';

describe('SettingsPanel image uploads', () => {
  beforeEach(() => {
    useSettings.setState({ ...defaultSettings, backgroundImageId: 'old-background' });
    vi.restoreAllMocks();
  });

  const uploadBackground = (file: File) => {
    const input = screen
      .getAllByText('Background')
      .find((element) => element.closest('label')?.querySelector('input[type=file]'))!
      .closest('label')!
      .querySelector('input[type=file]')!;
    fireEvent.change(input, { target: { files: [file] } });
  };

  it('saves a replacement before updating the setting and removing the old image', async () => {
    const events: string[] = [];
    vi.spyOn(imageStorage, 'save').mockImplementation(async () => {
      events.push('save');
      return 'new-background';
    });
    vi.spyOn(imageStorage, 'remove').mockImplementation(async () => {
      events.push(`remove:${useSettings.getState().backgroundImageId}`);
    });

    render(<SettingsPanel open onClose={() => undefined} />);
    uploadBackground(new File(['image'], 'background.png', { type: 'image/png' }));

    await waitFor(() => expect(imageStorage.remove).toHaveBeenCalledWith('old-background'));
    expect(useSettings.getState().backgroundImageId).toBe('new-background');
    expect(events).toEqual(['save', 'remove:new-background']);
  });

  it('keeps the previous ID and blob when saving fails', async () => {
    vi.spyOn(imageStorage, 'save').mockRejectedValue(new Error('Storage unavailable'));
    const remove = vi.spyOn(imageStorage, 'remove').mockResolvedValue();

    render(<SettingsPanel open onClose={() => undefined} />);
    uploadBackground(new File(['image'], 'background.png', { type: 'image/png' }));

    expect(await screen.findByText('Storage unavailable')).toBeInTheDocument();
    expect(useSettings.getState().backgroundImageId).toBe('old-background');
    expect(remove).not.toHaveBeenCalled();
  });
});
