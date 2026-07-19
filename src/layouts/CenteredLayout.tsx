import type { ReactNode } from 'react';

/** Full-height centered stage with an ambient gradient. Used by the home page. */
export const CenteredLayout = ({ children }: { children: ReactNode }) => (
  <main className="relative flex min-h-full items-center justify-center overflow-hidden bg-neutral-950 px-4 text-white">
    <div className="pointer-events-none absolute -top-1/3 left-1/2 h-[80vh] w-[80vh] -translate-x-1/2 rounded-full bg-sky-500/20 blur-3xl" />
    <div className="pointer-events-none absolute bottom-0 right-0 h-[60vh] w-[60vh] rounded-full bg-fuchsia-500/10 blur-3xl" />
    <div className="relative z-10 w-full max-w-xl">{children}</div>
  </main>
);
