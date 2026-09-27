import type { SVGProps } from 'react';

type Props = SVGProps<SVGSVGElement>;
const svg = (path: React.ReactNode, props: Props = {}) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    className="h-5 w-5"
    {...props}
  >
    {path}
  </svg>
);

export const PlayIcon = (props: Props) => svg(<path d="m8 5 11 7-11 7z" />, props);
export const PauseIcon = (props: Props) =>
  svg(
    <>
      <path d="M7 5v14M17 5v14" />
    </>,
    props,
  );
export const SettingsIcon = (props: Props) =>
  svg(
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2v2m0 16v2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4M2 12h2m16 0h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </>,
    props,
  );
export const FullscreenIcon = (props: Props) =>
  svg(<path d="M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5" />, props);
export const CloseIcon = (props: Props) => svg(<path d="M5 5 19 19M19 5 5 19" />, props);
export const HelpIcon = (props: Props) =>
  svg(
    <>
      <circle cx="12" cy="12" r="10" />
      <path d="M9 9a3 3 0 1 1 5 2c-2 1-2 2-2 3m0 4h.01" />
    </>,
    props,
  );
export const ResetIcon = (props: Props) =>
  svg(
    <>
      <path d="M3 12a9 9 0 1 0 3-7M3 4v5h5" />
    </>,
    props,
  );
