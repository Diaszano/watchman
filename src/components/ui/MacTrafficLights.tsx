interface Props {
  className?: string;
  onClose?: () => void;
  onMinimize?: () => void;
  onMaximize?: () => void;
}

export const MacTrafficLights = ({ className = '', onClose, onMinimize, onMaximize }: Props) => {
  return (
    <div className={`inline-flex items-center gap-2 group ${className}`} aria-hidden="true">
      <button
        type="button"
        tabIndex={-1}
        onClick={onClose}
        className="w-3 h-3 rounded-full bg-[#ff5f57] border border-[#e0443e]/40 transition-transform active:scale-90 flex items-center justify-center text-[7px] text-[#7d0000] opacity-90 group-hover:opacity-100"
        title="Close"
      >
        <span className="opacity-0 group-hover:opacity-100 font-bold leading-none">✕</span>
      </button>
      <button
        type="button"
        tabIndex={-1}
        onClick={onMinimize}
        className="w-3 h-3 rounded-full bg-[#febc2e] border border-[#d89e24]/40 transition-transform active:scale-90 flex items-center justify-center text-[7px] text-[#7d5000] opacity-90 group-hover:opacity-100"
        title="Minimize"
      >
        <span className="opacity-0 group-hover:opacity-100 font-bold leading-none">−</span>
      </button>
      <button
        type="button"
        tabIndex={-1}
        onClick={onMaximize}
        className="w-3 h-3 rounded-full bg-[#28c840] border border-[#1aab29]/40 transition-transform active:scale-90 flex items-center justify-center text-[7px] text-[#006000] opacity-90 group-hover:opacity-100"
        title="Zoom / Fullscreen"
      >
        <span className="opacity-0 group-hover:opacity-100 font-bold leading-none">＋</span>
      </button>
    </div>
  );
};
