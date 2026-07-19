export const Logo = ({ size = 72 }: { size?: number }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 64 64"
    aria-hidden
    className="drop-shadow-[0_0_20px_rgba(56,189,248,0.5)]"
  >
    <circle cx="32" cy="32" r="18" fill="none" stroke="#38bdf8" strokeWidth="4" />
    <circle cx="32" cy="32" r="7" fill="#38bdf8" />
  </svg>
);
