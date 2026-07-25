import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { imageStorage } from '@/services/imageStorage';
import { defaultSettings, useSettings } from '@/stores/settingsStore';
import { SettingsPanel } from './SettingsPanel';

describe('SettingsPanel', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    localStorage.clear();
    useSettings.setState({ ...defaultSettings, backgroundImageId: 'old-background' });
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
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

  it('removes both stored images when resetting settings', async () => {
    useSettings.setState({
      ...defaultSettings,
      backgroundImageId: 'background-image',
      customImageId: 'custom-image',
      speed: 2,
    });
    const remove = vi.spyOn(imageStorage, 'remove').mockResolvedValue();

    render(<SettingsPanel open onClose={() => undefined} />);
    fireEvent.click(screen.getByRole('button', { name: 'Reset' }));

    await waitFor(() => expect(remove).toHaveBeenCalledTimes(2));
    expect(remove).toHaveBeenCalledWith('background-image');
    expect(remove).toHaveBeenCalledWith('custom-image');
    expect(useSettings.getState()).toMatchObject(defaultSettings);
  });

  it('keeps reset settings and reports cleanup failure after attempting both images', async () => {
    useSettings.setState({
      ...defaultSettings,
      backgroundImageId: 'background-image',
      customImageId: 'custom-image',
      speed: 2,
    });
    const remove = vi.spyOn(imageStorage, 'remove')
      .mockRejectedValueOnce(new Error('Cleanup unavailable'))
      .mockResolvedValueOnce();

    render(<SettingsPanel open onClose={() => undefined} />);
    fireEvent.click(screen.getByRole('button', { name: 'Reset' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Cleanup unavailable');
    expect(remove).toHaveBeenCalledTimes(2);
    expect(useSettings.getState()).toMatchObject(defaultSettings);
  });

  it('clears an earlier image error after a successful removal', async () => {
    useSettings.setState({
      ...defaultSettings,
      backgroundImageId: 'background-image',
      customImageId: 'custom-image',
    });
    vi.spyOn(imageStorage, 'remove')
      .mockRejectedValueOnce(new Error('Cleanup unavailable'))
      .mockResolvedValueOnce();

    render(<SettingsPanel open onClose={() => undefined} />);
    fireEvent.click(screen.getByRole('button', { name: 'Custom logo' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Cleanup unavailable');

    fireEvent.click(screen.getByRole('button', { name: 'Background' }));
    await waitFor(() => expect(screen.queryByRole('alert')).not.toBeInTheDocument());
  });

  it('switches rendering quality to High', () => {
    render(<SettingsPanel open onClose={() => undefined} />);

    fireEvent.change(screen.getByDisplayValue('Auto'), { target: { value: 'high' } });

    expect(useSettings.getState().renderQuality).toBe('high');
  });

  it('persists image IDs without binary image content', () => {
    useSettings.persist.clearStorage();
    useSettings.getState().patch({
      backgroundImageId: 'background-image-42',
      customImageId: 'custom-image-84',
    });

    vi.advanceTimersByTime(250);

    const serialized = localStorage.getItem('watchman-settings');
    expect(serialized).not.toBeNull();
    expect(serialized).toContain('"backgroundImageId":"background-image-42"');
    expect(serialized).toContain('"customImageId":"custom-image-84"');
    expect(serialized).not.toContain('data:image');
    expect(serialized).not.toContain('base64');
    expect(serialized).not.toContain('Blob');
  });
});
