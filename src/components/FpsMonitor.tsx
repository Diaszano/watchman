interface Props {
  fps: number;
}

export const FpsMonitor = ({ fps }: Props) => {
  const color =
    fps >= 55
      ? 'text-emerald-400 bg-emerald-400'
      : fps >= 30
        ? 'text-amber-400 bg-amber-400'
        : 'text-rose-400 bg-rose-400';

  const textColor = fps >= 55 ? 'text-emerald-400' : fps >= 30 ? 'text-amber-400' : 'text-rose-400';

  return (
    <div className="pointer-events-none fixed left-4 top-4 z-30 flex items-center gap-2 rounded-xl bg-black/60 border border-white/10 px-3 py-1.5 font-mono text-xs text-white/90 shadow-xl backdrop-blur-xl">
      <span className={`inline-block h-1.5 w-1.5 rounded-full ${color}`} />
      <span className={`font-semibold ${textColor}`}>{fps} FPS</span>
    </div>
  );
};
