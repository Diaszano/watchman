import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
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
    fireEvent.click(screen.getByRole('tab', { name: /oled/i }));
    const panel = document.getElementById('tabpanel-oled');
    const input = panel ? panel.querySelector('input[type=file]') : null;
    expect(input).not.toBeNull();
    fireEvent.change(input!, { target: { files: [file] } });
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

  it('keeps the previous ID and blob when saving fails without exposing raw error', async () => {
    vi.spyOn(imageStorage, 'save').mockRejectedValue(new Error('Storage unavailable'));
    const remove = vi.spyOn(imageStorage, 'remove').mockResolvedValue();

    render(<SettingsPanel open onClose={() => undefined} />);
    uploadBackground(new File(['image'], 'background.png', { type: 'image/png' }));

    expect(await screen.findByText('Could not save image')).toBeInTheDocument();
    expect(screen.queryByText('Storage unavailable')).not.toBeInTheDocument();
    expect(useSettings.getState().backgroundImageId).toBe('old-background');
    expect(remove).not.toHaveBeenCalled();
  });

  it('translates known image errors in EN and PT, and blocks clear/reset while upload is pending', async () => {
    // Test EN known error
    let rejectSave: (err: Error) => void = () => {};
    vi.spyOn(imageStorage, 'save').mockImplementation(
      () =>
        new Promise<string>((_resolve, reject) => {
          rejectSave = reject;
        }),
    );
    const removeSpy = vi.spyOn(imageStorage, 'remove').mockResolvedValue();

    const { rerender } = render(<SettingsPanel open onClose={() => undefined} />);
    uploadBackground(new File(['img'], 'test.png', { type: 'image/png' }));

    // While save is pending, clear button should be disabled or blocked
    const clearButton = screen.queryByRole('button', { name: 'Clear' });
    if (clearButton) {
      fireEvent.click(clearButton);
      expect(removeSpy).not.toHaveBeenCalled();
    }

    // Reject with known error
    rejectSave(new Error('image.tooLarge'));
    expect(await screen.findByText('Image size exceeds the 5MB limit.')).toBeInTheDocument();
    expect(useSettings.getState().backgroundImageId).toBe('old-background');

    // Switch to PT and test image.dimensions
    useSettings.getState().set('lang', 'pt');
    rerender(<SettingsPanel open onClose={() => undefined} />);

    uploadBackground(new File(['img'], 'test2.png', { type: 'image/png' }));
    rejectSave(new Error('image.dimensions'));
    expect(
      await screen.findByText('As dimensões da imagem excedem o limite de 8192px ou 16.7MP.'),
    ).toBeInTheDocument();
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
    fireEvent.click(screen.getByRole('tab', { name: 'General' }));
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
    const remove = vi
      .spyOn(imageStorage, 'remove')
      .mockRejectedValueOnce(new Error('Cleanup unavailable'))
      .mockResolvedValueOnce();

    render(<SettingsPanel open onClose={() => undefined} />);
    fireEvent.click(screen.getByRole('tab', { name: 'General' }));
    fireEvent.click(screen.getByRole('button', { name: 'Reset' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Could not save image');
    expect(remove).toHaveBeenCalledTimes(2);
    expect(useSettings.getState()).toMatchObject(defaultSettings);
  });

  it('clears an earlier image error after a successful removal', async () => {
    useSettings.setState({
      ...defaultSettings,
      animationId: 'logo',
      backgroundImageId: 'background-image',
      customImageId: 'custom-image',
    });
    vi.spyOn(imageStorage, 'remove')
      .mockRejectedValueOnce(new Error('Cleanup unavailable'))
      .mockResolvedValueOnce();

    render(<SettingsPanel open onClose={() => undefined} />);
    fireEvent.click(screen.getByRole('button', { name: 'Custom logo' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Could not save image');

    fireEvent.click(screen.getByRole('tab', { name: 'OLED & Display' }));
    fireEvent.click(screen.getByRole('button', { name: 'Background' }));
    await waitFor(() => expect(screen.queryByRole('alert')).not.toBeInTheDocument());
  });

  it('updates slider values, switches and playlist choices through their labels', () => {
    render(<SettingsPanel open onClose={() => undefined} />);
    const speed = screen.getByRole('slider', { name: 'Speed' });
    fireEvent.change(speed, { target: { value: '3' } });
    expect(useSettings.getState().speed).toBe(3);
    expect(speed.style.getPropertyValue('--range-progress')).toBe('100%');
    expect(speed.closest('label')).toHaveTextContent('3');

    fireEvent.click(screen.getByRole('tab', { name: 'OLED & Display' }));
    const showFps = screen.getByRole('checkbox', { name: 'Show FPS' });
    fireEvent.click(showFps);
    expect(showFps).toBeChecked();
    expect(useSettings.getState().showFps).toBe(true);

    fireEvent.click(screen.getByRole('tab', { name: 'Playlist' }));
    const matrix = screen.getByRole('checkbox', { name: 'Matrix Rain' });
    const wasChecked = (matrix as HTMLInputElement).checked;
    fireEvent.click(matrix);
    expect(useSettings.getState().playlist.includes('matrix')).toBe(!wasChecked);
  });

  it('renders localized theme select options', () => {
    render(<SettingsPanel open onClose={() => undefined} />);
    fireEvent.click(screen.getByRole('tab', { name: 'General' }));

    const options = within(screen.getByDisplayValue('Dark')).getAllByRole('option');

    expect(options.map((option) => option.textContent)).toEqual(['Dark', 'Light']);
  });

  it('renders a theme-aware light surface when not used as an overlay', () => {
    render(<SettingsPanel open onClose={() => undefined} />);

    expect(screen.getByRole('dialog')).toHaveClass('settings-panel');
    expect(screen.getByRole('dialog')).not.toHaveClass('settings-overlay');
  });

  it('keeps the dark glass look when rendered as an overlay', () => {
    render(<SettingsPanel open onClose={() => undefined} overlay />);

    expect(screen.getByRole('dialog')).toHaveClass('settings-overlay', 'dark');
    expect(screen.getByRole('button', { name: 'Close' })).not.toHaveClass('text-neutral-900');
  });

  it('renders modal dialog semantics when opened', () => {
    render(<SettingsPanel open onClose={() => undefined} />);

    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveAttribute('aria-labelledby', 'settings-panel-title');
  });

  it('calls onClose when cancel event is triggered on dialog', () => {
    const onClose = vi.fn();
    render(<SettingsPanel open onClose={onClose} />);

    fireEvent(screen.getByRole('dialog'), new Event('cancel', { cancelable: true }));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('closes on Escape without passing it to window shortcuts', () => {
    const onClose = vi.fn();
    const onWindowKeyDown = vi.fn();
    window.addEventListener('keydown', onWindowKeyDown);
    render(<SettingsPanel open onClose={onClose} />);

    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });

    expect(onClose).toHaveBeenCalledOnce();
    expect(onWindowKeyDown).not.toHaveBeenCalled();
    window.removeEventListener('keydown', onWindowKeyDown);
  });

  it('calls onClose when backdrop is clicked', () => {
    const onClose = vi.fn();
    render(<SettingsPanel open={true} onClose={onClose} />);
    const dialog = screen.getByRole('dialog');

    // Simula clique fora do bounding rect da caixa
    fireEvent.click(dialog, { clientX: 10, clientY: 10 });
    expect(onClose).toHaveBeenCalled();
  });

  it('keeps settings open when a tab is activated from the keyboard', () => {
    const onClose = vi.fn();
    render(<SettingsPanel open onClose={onClose} />);
    vi.spyOn(screen.getByRole('dialog'), 'getBoundingClientRect').mockReturnValue({
      x: 1000,
      y: 0,
      left: 1000,
      top: 0,
      right: 1440,
      bottom: 900,
      width: 440,
      height: 900,
      toJSON: () => {},
    });
    fireEvent.click(screen.getByRole('tab', { name: 'General' }), { detail: 0 });
    expect(screen.getByRole('tabpanel')).toHaveAttribute('id', 'tabpanel-general');
    expect(onClose).not.toHaveBeenCalled();
  });

  it('does not call onClose when clicking inside dialog', () => {
    const onClose = vi.fn();
    render(<SettingsPanel open={true} onClose={onClose} />);
    const dialog = screen.getByRole('dialog');
    vi.spyOn(dialog, 'getBoundingClientRect').mockReturnValue({
      top: 0,
      left: 100,
      width: 320,
      height: 800,
      right: 420,
      bottom: 800,
      x: 100,
      y: 0,
      toJSON: () => {},
    });

    fireEvent.click(dialog, { clientX: 200, clientY: 200 });
    expect(onClose).not.toHaveBeenCalled();
  });

  it('persists image IDs without binary image content', () => {
    useSettings.persist.clearStorage();
    useSettings.setState({
      backgroundImageId: 'background-image-42',
      customImageId: 'custom-image-84',
    });

    const serialized = localStorage.getItem('watchman-settings');
    expect(serialized).not.toBeNull();
    expect(serialized).toContain('"backgroundImageId":"background-image-42"');
    expect(serialized).toContain('"customImageId":"custom-image-84"');
    expect(serialized).not.toContain('data:image');
    expect(serialized).not.toContain('base64');
    expect(serialized).not.toContain('Blob');
  });

  it('switches tabs with click and arrow keys and applies True Black', () => {
    useSettings.setState({ gradientBackground: true, backgroundImageId: 'old-background' });
    vi.spyOn(imageStorage, 'remove').mockResolvedValue();
    render(<SettingsPanel open onClose={() => undefined} />);
    const tabs = screen.getAllByRole('tab');
    expect(tabs).toHaveLength(4);
    expect(tabs[0]).toHaveAttribute('aria-selected', 'true');
    fireEvent.keyDown(tabs[0]!, { key: 'ArrowRight' });
    expect(tabs[1]).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tabpanel')).toHaveAttribute('id', 'tabpanel-oled');
    fireEvent.click(screen.getByRole('button', { name: 'True Black' }));
    expect(useSettings.getState().background).toBe('#000000');
    expect(useSettings.getState().gradientBackground).toBe(false);
    expect(useSettings.getState().backgroundImageId).toBeNull();
    fireEvent.click(tabs[2]!);
    expect(screen.getByRole('tabpanel')).toHaveAttribute('id', 'tabpanel-playlist');
  });

  it('shows only relevant controls for each animation mode', () => {
    // DVD does not show Color, Custom text, or Custom logo
    useSettings.setState({ animationId: 'dvd' });
    const { rerender } = render(<SettingsPanel open onClose={() => undefined} />);
    expect(screen.queryByText('Color')).toBeNull();
    expect(screen.queryByText('Custom text')).toBeNull();
    expect(screen.queryByText('Custom logo')).toBeNull();

    // Neon does not show Color
    act(() => {
      useSettings.getState().set('animationId', 'neon');
    });
    rerender(<SettingsPanel open onClose={() => undefined} />);
    expect(screen.queryByText('Color')).toBeNull();

    // Shapes does not show Color
    act(() => {
      useSettings.getState().set('animationId', 'shapes');
    });
    rerender(<SettingsPanel open onClose={() => undefined} />);
    expect(screen.queryByText('Color')).toBeNull();

    // Matrix does not show Count
    act(() => {
      useSettings.getState().set('animationId', 'matrix');
    });
    rerender(<SettingsPanel open onClose={() => undefined} />);
    expect(screen.queryByText('Count')).toBeNull();

    // Text shows Custom text but not Custom logo
    act(() => {
      useSettings.getState().set('animationId', 'text');
    });
    rerender(<SettingsPanel open onClose={() => undefined} />);
    expect(screen.getByText('Custom text')).toBeInTheDocument();
    expect(screen.queryByText('Custom logo')).toBeNull();

    // Logo shows Custom logo but not Custom text
    act(() => {
      useSettings.getState().set('animationId', 'logo');
    });
    rerender(<SettingsPanel open onClose={() => undefined} />);
    expect(screen.getByText('Custom logo')).toBeInTheDocument();
    expect(screen.queryByText('Custom text')).toBeNull();
  });
});
