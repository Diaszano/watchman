import { useSettings } from '@/stores/settingsStore';
import { useI18n } from '@/hooks/useI18n';
import { animations } from '@/animations';
import { readImageAsDataUrl } from '@/utils/file';
import { Button } from './Button';
import { ColorInput, Select, Slider, Toggle } from './controls';

interface Props {
  open: boolean;
  onClose: () => void;
}

export const SettingsPanel = ({ open, onClose }: Props) => {
  const { t } = useI18n();
  const s = useSettings();

  if (!open) return null;

  const togglePlaylist = (id: string) => {
    const next = s.playlist.includes(id) ? s.playlist.filter((x) => x !== id) : [...s.playlist, id];
    s.set('playlist', next);
  };

  return (
    <aside className="fixed right-0 top-0 z-40 flex h-full w-80 max-w-[90vw] flex-col gap-1 overflow-y-auto border-l border-white/10 bg-neutral-900/80 p-4 text-white backdrop-blur-xl">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-lg font-semibold">{t('settings.title')}</h2>
        <button onClick={onClose} aria-label="Close" className="text-white/60 hover:text-white">
          ✕
        </button>
      </div>

      <Slider
        label={t('settings.speed')}
        value={s.speed}
        min={0.1}
        max={3}
        step={0.1}
        onChange={(v) => s.set('speed', v)}
      />
      <Slider
        label={t('settings.count')}
        value={s.count}
        min={10}
        max={1000}
        step={10}
        onChange={(v) => s.set('count', v)}
      />
      <Slider
        label={t('settings.size')}
        value={s.size}
        min={5}
        max={200}
        step={1}
        onChange={(v) => s.set('size', v)}
      />
      <Slider
        label={t('settings.opacity')}
        value={s.opacity}
        min={0.1}
        max={1}
        step={0.05}
        onChange={(v) => s.set('opacity', v)}
      />
      <Slider
        label={t('settings.brightness')}
        value={s.brightness}
        min={0.2}
        max={1}
        step={0.05}
        onChange={(v) => s.set('brightness', v)}
      />

      <ColorInput label={t('settings.color')} value={s.color} onChange={(v) => s.set('color', v)} />
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

      <Select
        label={t('settings.theme')}
        value={s.theme}
        options={[
          { value: 'dark', label: 'Dark' },
          { value: 'light', label: 'Light' },
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

      {/* Custom text + uploads */}
      <label className="flex flex-col gap-1 py-1.5 text-sm">
        <span className="text-white/80">{t('settings.customText')}</span>
        <input
          type="text"
          value={s.customText}
          onChange={(e) => s.set('customText', e.target.value)}
          className="rounded-lg border border-white/10 bg-white/10 px-2 py-1 outline-none"
        />
      </label>

      <FileField
        label={t('settings.customImage')}
        onFile={(f) => readImageAsDataUrl(f).then((d) => s.set('customImage', d))}
        onClear={s.customImage ? () => s.set('customImage', null) : undefined}
      />
      <FileField
        label={t('settings.background')}
        onFile={(f) => readImageAsDataUrl(f).then((d) => s.set('backgroundImage', d))}
        onClear={s.backgroundImage ? () => s.set('backgroundImage', null) : undefined}
      />

      {/* Playlist */}
      <div className="mt-3 border-t border-white/10 pt-3">
        <p className="mb-1 text-sm font-medium text-white/80">{t('settings.playlist')}</p>
        <div className="grid grid-cols-2 gap-1">
          {animations.map((a) => (
            <label key={a.id} className="flex items-center gap-2 text-xs">
              <input
                type="checkbox"
                checked={s.playlist.includes(a.id)}
                onChange={() => togglePlaylist(a.id)}
                className="accent-sky-500"
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
              { value: 'sequential', label: 'Sequential' },
              { value: 'random', label: 'Random' },
            ]}
            onChange={(v) => s.set('playlistMode', v)}
          />
        </div>
      </div>

      <Button className="mt-4" onClick={s.reset}>
        {t('settings.reset')}
      </Button>
    </aside>
  );
};

const FileField = ({
  label,
  onFile,
  onClear,
}: {
  label: string;
  onFile: (f: File) => void;
  onClear?: () => void;
}) => (
  <label className="flex items-center justify-between gap-2 py-1.5 text-sm">
    <span className="text-white/80">{label}</span>
    <span className="flex items-center gap-1">
      {onClear && (
        <button onClick={onClear} className="text-xs text-white/50 hover:text-white">
          clear
        </button>
      )}
      <input
        type="file"
        accept="image/*"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onFile(f);
        }}
        className="w-28 text-xs file:mr-1 file:rounded file:border-0 file:bg-sky-500 file:px-2 file:py-1 file:text-white"
      />
    </span>
  </label>
);
