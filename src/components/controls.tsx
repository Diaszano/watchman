import type { ReactNode } from 'react';

const Row = ({ label, children }: { label: string; children: ReactNode }) => (
  <label className="flex items-center justify-between gap-3 py-1.5 text-sm">
    <span className="text-white/80">{label}</span>
    {children}
  </label>
);

export const Slider = (p: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
}) => (
  <Row label={`${p.label} (${p.value})`}>
    <input
      type="range"
      min={p.min}
      max={p.max}
      step={p.step}
      value={p.value}
      onChange={(e) => p.onChange(Number(e.target.value))}
      className="w-40 accent-sky-500"
    />
  </Row>
);

export const Toggle = (p: { label: string; value: boolean; onChange: (v: boolean) => void }) => (
  <Row label={p.label}>
    <input
      type="checkbox"
      checked={p.value}
      onChange={(e) => p.onChange(e.target.checked)}
      className="h-5 w-5 accent-sky-500"
    />
  </Row>
);

export const ColorInput = (p: { label: string; value: string; onChange: (v: string) => void }) => (
  <Row label={p.label}>
    <input
      type="color"
      value={p.value}
      onChange={(e) => p.onChange(e.target.value)}
      className="h-8 w-14 cursor-pointer rounded bg-transparent"
    />
  </Row>
);

export const Select = <T extends string>(p: {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}) => (
  <Row label={p.label}>
    <select
      value={p.value}
      onChange={(e) => p.onChange(e.target.value as T)}
      className="rounded-lg border border-white/10 bg-white/10 px-2 py-1 text-white outline-none"
    >
      {p.options.map((o) => (
        <option key={o.value} value={o.value} className="bg-neutral-900">
          {o.label}
        </option>
      ))}
    </select>
  </Row>
);
