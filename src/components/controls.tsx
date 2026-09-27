import type { CSSProperties, ReactNode } from 'react';

const Row = ({ label, children }: { label: ReactNode; children: ReactNode }) => (
  <label className="setting-row">
    <span className="setting-label">{label}</span>
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
  <label className="setting-slider">
    <span className="slider-heading">
      <span>{p.label}</span>
      <span className="setting-value" aria-hidden="true">
        {p.value}
      </span>
    </span>
    <input
      type="range"
      aria-label={p.label}
      style={
        { '--range-progress': `${((p.value - p.min) / (p.max - p.min)) * 100}%` } as CSSProperties
      }
      min={p.min}
      max={p.max}
      step={p.step}
      value={p.value}
      onChange={(e) => p.onChange(Number(e.target.value))}
      className="setting-range"
    />
  </label>
);

export const Toggle = (p: { label: string; value: boolean; onChange: (v: boolean) => void }) => (
  <Row label={p.label}>
    <input
      type="checkbox"
      checked={p.value}
      onChange={(e) => p.onChange(e.target.checked)}
      className="setting-switch"
    />
  </Row>
);

export const ColorInput = (p: { label: string; value: string; onChange: (v: string) => void }) => (
  <Row label={p.label}>
    <span className="setting-color">
      <span aria-hidden="true">{p.value.toUpperCase()}</span>
      <input
        aria-label={p.label}
        type="color"
        value={p.value}
        onChange={(e) => p.onChange(e.target.value)}
        className="setting-swatch"
      />
    </span>
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
      className="setting-select"
    >
      {p.options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  </Row>
);
