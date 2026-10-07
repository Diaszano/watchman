import { useEffect, useRef, useState } from 'react';
import { useSettings } from '@/stores/settingsStore';
import { useI18n } from '@/hooks/useI18n';
import { animations, getAnimation } from '@/animations';
import { imageStorage } from '@/services/imageStorage';
import type { PerModeControl } from '@/types';
import { Button } from './Button';
import { IconButton } from './IconButton';
import { CloseIcon, SettingsIcon, ResetIcon } from './icons';
import { ColorInput, Select, Slider, Toggle } from './controls';

interface Props {
  open: boolean;
  onClose: () => void;
  overlay?: boolean;
}

const tabs = ['animation', 'oled', 'playlist', 'general'] as const;
type SettingsTab = (typeof tabs)[number];
const paletteStopIds = ['first', 'second', 'third', 'fourth'] as const;

export const SettingsPanel = ({ open, onClose, overlay = false }: Props) => {
  const { t } = useI18n();
  const s = useSettings();
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<SettingsTab>('animation');
  const dialogRef = useRef<HTMLDialogElement>(null);
  const openerRef = useRef<HTMLElement | null>(null);

  const [isImageProcessing, setIsImageProcessing] = useState(false);

  useEffect(() => {
    if (open) {
      if (!openerRef.current && document.activeElement) {
        openerRef.current = document.activeElement as HTMLElement;
      }
      const dialog = dialogRef.current;
      if (dialog && !dialog.open) {
        dialog.showModal();
      }
    } else {
      const dialog = dialogRef.current;
      if (dialog?.open) {
        dialog.close();
      }
      if (openerRef.current?.isConnected) {
        openerRef.current.focus();
        openerRef.current = null;
      }
    }
  }, [open]);

  useEffect(() => {
    return () => {
      if (openerRef.current?.isConnected) {
        openerRef.current.focus();
      }
    };
  }, []);

  if (!open) return null;

  const resolveImageError = (error: unknown): string => {
    const message = error instanceof Error ? error.message : '';
    if (
      message === 'image.invalid' ||
      message === 'image.tooLarge' ||
      message === 'image.dimensions'
    ) {
      return t(message);
    }
    return t('settings.imageSaveFailed');
  };

  const replaceImage = async (key: 'backgroundImageId' | 'customImageId', file: File) => {
    if (isImageProcessing) return;
    setIsImageProcessing(true);
    const previousId = s[key];
    setUploadError(null);
    try {
      const nextId = await imageStorage.save(file);
      s.set(key, nextId);
      if (previousId) {
        try {
          await imageStorage.remove(previousId);
        } catch {
          // Distinguish old image cleanup failure from saving failure
        }
      }
    } catch (error) {
      setUploadError(resolveImageError(error));
    } finally {
      setIsImageProcessing(false);
    }
  };

  const clearImage = async (key: 'backgroundImageId' | 'customImageId') => {
    if (isImageProcessing) return;
    setIsImageProcessing(true);
    const previousId = s[key];
    setUploadError(null);
    s.set(key, null);
    if (!previousId) {
      setIsImageProcessing(false);
      return;
    }
    try {
      await imageStorage.remove(previousId);
    } catch (error) {
      setUploadError(resolveImageError(error));
    } finally {
      setIsImageProcessing(false);
    }
  };

  const resetSettings = async () => {
    if (isImageProcessing) return;
    setIsImageProcessing(true);
    const imageIds = [s.backgroundImageId, s.customImageId].filter(
      (id): id is string => id !== null,
    );
    setUploadError(null);
    s.reset();

    try {
      const results = await Promise.allSettled(imageIds.map((id) => imageStorage.remove(id)));
      const failure = results.find((result) => result.status === 'rejected');
      if (failure?.status === 'rejected') {
        setUploadError(resolveImageError(failure.reason));
      }
    } finally {
      setIsImageProcessing(false);
    }
  };

  const togglePlaylist = (id: string) => {
    const next = s.playlist.includes(id) ? s.playlist.filter((x) => x !== id) : [...s.playlist, id];
    s.set('playlist', next);
  };

  const meta = getAnimation(s.animationId);
  const isRelevant = (control: PerModeControl) => !meta.controls || meta.controls.includes(control);

  const handleDialogClick = (e: React.MouseEvent<HTMLDialogElement>) => {
    if (e.target !== e.currentTarget) return;
    const dialog = dialogRef.current;
    if (!dialog) return;
    const rect = dialog.getBoundingClientRect();
    const isInDialog =
      rect.top <= e.clientY &&
      e.clientY <= rect.top + rect.height &&
      rect.left <= e.clientX &&
      e.clientX <= rect.left + rect.width;

    if (!isInDialog) {
      onClose();
    }
  };

  return (
    <dialog
      ref={dialogRef}
      aria-modal="true"
      aria-busy={isImageProcessing}
      aria-labelledby="settings-panel-title"
      onClick={handleDialogClick}
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          e.preventDefault();
          e.stopPropagation();
          onClose();
        }
      }}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      className={`settings-panel ${overlay ? 'dark settings-overlay' : ''}`}
    >
      <div className="settings-header">
        <div className="settings-heading">
          <span className="settings-heading-icon">
            <SettingsIcon />
          </span>
          <div>
            <h2
              id="settings-panel-title"
              className="text-base font-semibold text-[var(--text-primary)]"
            >
              {t('settings.title')}
            </h2>
            <p className="settings-description">{t('settings.subtitle')}</p>
          </div>
        </div>
        <IconButton onClick={onClose} label={t('shortcuts.close')} icon={<CloseIcon />} />
      </div>

      <div role="tablist" aria-label={t('settings.title')} className="settings-tabs">
        {tabs.map((tab, index) => (
          <button
            key={tab}
            id={`tab-${tab}`}
            type="button"
            role="tab"
            aria-selected={activeTab === tab}
            aria-controls={`tabpanel-${tab}`}
            tabIndex={activeTab === tab ? 0 : -1}
            onClick={() => setActiveTab(tab)}
            onKeyDown={(e) => {
              const next =
                e.key === 'ArrowRight'
                  ? index + 1
                  : e.key === 'ArrowLeft'
                    ? index - 1
                    : e.key === 'Home'
                      ? 0
                      : e.key === 'End'
                        ? tabs.length - 1
                        : null;
              if (next === null) return;
              e.preventDefault();
              const target = tabs[(next + tabs.length) % tabs.length]!;
              setActiveTab(target);
              document.getElementById(`tab-${target}`)?.focus();
            }}
            className="settings-tab"
          >
            {t(`settings.tab.${tab}`)}
          </button>
        ))}
      </div>
      <div
        role="tabpanel"
        id={`tabpanel-${activeTab}`}
        aria-labelledby={`tab-${activeTab}`}
        className="settings-body"
      >
        <div className="settings-context">
          <span>{t(`settings.tab.${activeTab}`)}</span>
          <p>
            {activeTab === 'animation'
              ? t(`anim.${s.animationId}`)
              : t(`settings.intro.${activeTab}`)}
          </p>
        </div>
        {activeTab === 'animation' && (
          <>
            {isRelevant('speed') && (
              <Slider
                label={t('settings.speed')}
                value={s.speed}
                min={0.1}
                max={3}
                step={0.1}
                onChange={(v) => s.set('speed', v)}
              />
            )}
            {isRelevant('count') && (
              <Slider
                label={t('settings.count')}
                value={s.count}
                min={10}
                max={1000}
                step={10}
                onChange={(v) => s.set('count', v)}
              />
            )}
            {isRelevant('size') && (
              <Slider
                label={t('settings.size')}
                value={s.size}
                min={5}
                max={200}
                step={1}
                onChange={(v) => s.set('size', v)}
              />
            )}
            {isRelevant('opacity') && (
              <Slider
                label={t('settings.opacity')}
                value={s.opacity}
                min={0.1}
                max={1}
                step={0.05}
                onChange={(v) => s.set('opacity', v)}
              />
            )}
            {isRelevant('brightness') && (
              <Slider
                label={t('settings.brightness')}
                value={s.brightness}
                min={0.2}
                max={1}
                step={0.05}
                onChange={(v) => s.set('brightness', v)}
              />
            )}

            {isRelevant('color') && (
              <ColorInput
                label={t('settings.color')}
                value={s.color}
                onChange={(v) => s.set('color', v)}
              />
            )}
            {s.animationId === 'solid' && <p className="setting-help">{t('anim.solid.note')}</p>}
            {isRelevant('palette') && (
              <>
                <Select
                  label={t('settings.palette')}
                  value={s.colorPaletteId}
                  options={(['watchman', 'aurora', 'sunset', 'ocean', 'custom'] as const).map(
                    (palette) => ({ value: palette, label: t(`palette.${palette}`) }),
                  )}
                  onChange={(value) => s.set('colorPaletteId', value as typeof s.colorPaletteId)}
                />
                {s.colorPaletteId === 'custom' &&
                  s.customColorPalette.map((color, index) => (
                    <ColorInput
                      key={paletteStopIds[index]}
                      label={t(`settings.paletteStop.${index + 1}`)}
                      value={color}
                      onChange={(value) => {
                        const colors = [...s.customColorPalette] as typeof s.customColorPalette;
                        colors[index] = value;
                        s.set('customColorPalette', colors);
                      }}
                    />
                  ))}
              </>
            )}
          </>
        )}
        {activeTab === 'oled' && (
          <>
            <ColorInput
              label={t('settings.background')}
              value={s.background}
              onChange={(v) => s.set('background', v)}
            />
            <Toggle
              label={t('settings.gradient')}
              value={s.gradientBackground}
              onChange={(v) => s.set('gradientBackground', v)}
            />

            <Select
              label={t('settings.fps')}
              value={String(s.fpsLimit)}
              options={[
                { value: '30', label: '30' },
                { value: '60', label: '60' },
                { value: '120', label: '120' },
                { value: '0', label: '∞' },
              ]}
              onChange={(v) => s.set('fpsLimit', Number(v))}
            />
            <Toggle
              label={t('settings.showFps')}
              value={s.showFps}
              onChange={(v) => s.set('showFps', v)}
            />
            <Toggle
              label={t('settings.antiBurnIn')}
              value={s.antiBurnIn}
              onChange={(v) => s.set('antiBurnIn', v)}
            />
            <p className="setting-help">{t('settings.antiBurnIn.desc')}</p>
            <Button
              disabled={isImageProcessing}
              onClick={() => {
                s.set('background', '#000000');
                s.set('gradientBackground', false);
                void clearImage('backgroundImageId');
              }}
            >
              {t('settings.trueBlack')}
            </Button>
            <FileField
              label={t('settings.background')}
              clearLabel={t('settings.clear')}
              disabled={isImageProcessing}
              onFile={(file) => void replaceImage('backgroundImageId', file)}
              onClear={s.backgroundImageId ? () => void clearImage('backgroundImageId') : undefined}
            />
          </>
        )}

        {activeTab === 'general' && (
          <>
            <Select
              label={t('settings.theme')}
              value={s.theme}
              options={[
                { value: 'dark', label: t('settings.theme.dark') },
                { value: 'light', label: t('settings.theme.light') },
                { value: 'system', label: t('settings.theme.system') },
              ]}
              onChange={(v) => s.set('theme', v)}
            />
            <Select
              label={t('settings.lang')}
              value={s.lang}
              options={[
                { value: 'en', label: 'English' },
                { value: 'pt', label: 'Português' },
              ]}
              onChange={(v) => s.set('lang', v)}
            />
            <Button
              className="settings-reset"
              variant="secondary"
              disabled={isImageProcessing}
              onClick={() => void resetSettings()}
            >
              <ResetIcon /> {t('settings.reset')}
            </Button>
          </>
        )}

        {/* Custom text + uploads */}
        {activeTab === 'animation' && s.animationId === 'text' && (
          <label className="setting-text">
            <span className="setting-label">{t('settings.customText')}</span>
            <input
              type="text"
              value={s.customText}
              onChange={(e) => s.set('customText', e.target.value)}
              className="setting-text-input"
            />
          </label>
        )}
        {activeTab === 'animation' && s.animationId === 'logo' && (
          <FileField
            label={t('settings.customImage')}
            clearLabel={t('settings.clear')}
            disabled={isImageProcessing}
            onFile={(file) => void replaceImage('customImageId', file)}
            onClear={s.customImageId ? () => void clearImage('customImageId') : undefined}
          />
        )}
        {uploadError && (
          <p role="alert" className="text-xs text-red-600 dark:text-red-300">
            {uploadError}
          </p>
        )}

        {/* Playlist */}
        {activeTab === 'playlist' && (
          <div className="settings-playlist">
            <p className="sr-only">{t('settings.playlist')}</p>
            <div className="playlist-grid">
              {animations.map((a) => (
                <label key={a.id} className="playlist-choice">
                  <input
                    type="checkbox"
                    checked={s.playlist.includes(a.id)}
                    onChange={() => togglePlaylist(a.id)}
                    className="accent-purple-500"
                  />
                  {t(`anim.${a.id}`)}
                </label>
              ))}
            </div>
            <div className="mt-2">
              <Slider
                label={t('settings.autoSwitch')}
                value={s.autoSwitch}
                min={0}
                max={120}
                step={5}
                onChange={(v) => s.set('autoSwitch', v)}
              />
              <Select
                label={t('settings.playlistMode')}
                value={s.playlistMode}
                options={[
                  { value: 'sequential', label: t('settings.playlistMode.sequential') },
                  { value: 'random', label: t('settings.playlistMode.random') },
                ]}
                onChange={(v) => s.set('playlistMode', v)}
              />
            </div>
          </div>
        )}
      </div>
    </dialog>
  );
};

const FileField = ({
  label,
  clearLabel,
  disabled,
  onFile,
  onClear,
}: {
  label: string;
  clearLabel?: string;
  disabled?: boolean;
  onFile: (f: File) => void;
  onClear?: () => void;
}) => (
  <label className="setting-upload">
    <span className="setting-label">{label}</span>
    <span className="upload-actions">
      {onClear && (
        <button
          type="button"
          onClick={onClear}
          disabled={disabled}
          className="text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] disabled:opacity-50 transition-colors"
        >
          {clearLabel ?? 'clear'}
        </button>
      )}
      <input
        type="file"
        accept="image/*"
        disabled={disabled}
        onChange={(e) => {
          const f = e.target.files?.[0];
          e.target.value = '';
          if (f) onFile(f);
        }}
        className="setting-file"
      />
    </span>
  </label>
);
