interface Props {
  fps: number;
}

export const FpsMonitor = ({ fps }: Props) => {
  const color = fps >= 55 ? 'text-emerald-400' : fps >= 30 ? 'text-amber-400' : 'text-red-400';
  return (
    <div className="pointer-events-none fixed left-3 top-3 z-30 rounded-md bg-black/50 px-2 py-1 font-mono text-xs backdrop-blur">
      <span className={color}>{fps} FPS</span>
    </div>
  );
};
