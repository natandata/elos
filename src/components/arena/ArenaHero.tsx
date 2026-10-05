import type { BiblicalArena } from "@/lib/arena/arenas";

/** Ilustração do lugar da arena atual, com o escudo das espadas cruzadas por cima. */
export function ArenaHero({ arena }: { arena: BiblicalArena }) {
  return (
    <div className="relative mx-auto flex w-full max-w-[320px] flex-col items-center pt-10">
      {/* brilho e chão sob a ilustração */}
      <div className="pointer-events-none absolute inset-x-4 bottom-0 top-8 rounded-full bg-[radial-gradient(closest-side,rgba(255,255,255,0.32),transparent)]" />
      <div className="pointer-events-none absolute bottom-1 h-5 w-44 rounded-[50%] bg-black/35 blur-md" />
      <svg viewBox="-32 -38 64 84" className="absolute left-1/2 top-0 z-10 h-[58px] -translate-x-1/2 drop-shadow-[0_4px_4px_rgba(0,0,0,0.5)]" aria-hidden>
        <defs>
          <linearGradient id="shield" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#3a3f49" />
            <stop offset="1" stopColor="#14171d" />
          </linearGradient>
        </defs>
        <path d="M-30 -34 H30 V6 C30 24 12 36 0 42 C-12 36 -30 24 -30 6 Z" fill="url(#shield)" stroke="#e5e7eb" strokeWidth="3.5" strokeLinejoin="round" />
        <g stroke="#1b2230" strokeWidth="2">
          <rect x="-4" y="-34" width="8" height="64" rx="3" fill="#f1f5f9" transform="rotate(45)" />
          <rect x="-4" y="-34" width="8" height="64" rx="3" fill="#f1f5f9" transform="rotate(-45)" />
          <rect x="-12" y="14" width="24" height="6" rx="2" fill="#facc15" transform="rotate(45) translate(0 -2)" />
          <rect x="-12" y="14" width="24" height="6" rx="2" fill="#facc15" transform="rotate(-45) translate(0 -2)" />
        </g>
        <circle cx="0" cy="0" r="5" fill="#facc15" stroke="#7c5a06" strokeWidth="1.5" />
      </svg>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        key={arena.key}
        src={arena.art}
        alt={arena.name}
        draggable={false}
        className="arena-float relative z-[1] h-[196px] w-auto max-w-full object-contain drop-shadow-[0_14px_10px_rgba(0,0,0,0.45)]"
      />
    </div>
  );
}
