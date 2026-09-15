export const Logo = ({ size = 240 }: { size?: number }) => (
  <img
    src="/logo.png"
    alt=""
    width={size}
    className="h-auto max-w-full drop-shadow-[0_0_20px_rgba(56,189,248,0.5)]"
  />
);
