import type { ArenaTheme } from "@/lib/arena/arenas";

/** Miniatura ilustrada da arena (campo, rio, pontes e torres) com o escudo das espadas cruzadas. */
export function ArenaHero({ theme }: { theme: ArenaTheme }) {
  const tower = (x: number, y: number, color: string, dark: string, big = false) => {
    const w = big ? 34 : 26;
    const h = big ? 36 : 28;
    return (
      <g transform={`translate(${x} ${y})`}>
        <ellipse cx="0" cy={h * 0.55} rx={w * 0.7} ry="5" fill="rgba(0,0,0,0.3)" />
        <rect x={-w / 2} y={-h / 2} width={w} height={h} rx="3" fill="#b9c0ca" stroke="#4b5563" strokeWidth="2" />
        <rect x={-w / 2} y={-h / 2} width={w} height={h * 0.28} rx="2" fill={color} stroke={dark} strokeWidth="1.5" />
        {[-1, 0, 1].map((i) => (
          <rect key={i} x={i * (w / 3) - 3} y={-h / 2 - 5} width="6" height="6" fill="#d3d8df" stroke="#4b5563" strokeWidth="1.2" />
        ))}
        <rect x="-4" y="-2" width="8" height="12" rx="3" fill="#6b7280" />
        <circle cx="0" cy={-h / 2 - 8} r="3.2" fill="#facc15" stroke="#7c5a06" strokeWidth="1" />
      </g>
    );
  };
  return (
    <svg viewBox="10 10 300 240" className="mx-auto block h-auto w-full max-w-[340px] drop-shadow-[0_10px_8px_rgba(0,0,0,0.35)]" role="img" aria-label="Arena">
      <defs>
        <linearGradient id="hw" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={theme.water[0]} />
          <stop offset="1" stopColor={theme.water[1]} />
        </linearGradient>
        <linearGradient id="hs" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#6c7787" />
          <stop offset="1" stopColor="#3b4454" />
        </linearGradient>
        <linearGradient id="hshield" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#3a3f49" />
          <stop offset="1" stopColor="#14171d" />
        </linearGradient>
      </defs>

      {/* pedras flutuando */}
      <polygon points="22,70 38,60 50,72 44,88 26,86" fill="#7d8794" stroke="#3a4250" strokeWidth="2" />
      <polygon points="270,50 288,44 298,60 284,72 268,66" fill="#7d8794" stroke="#3a4250" strokeWidth="2" />
      <polygon points="286,170 298,164 306,178 296,190 284,184" fill="#6d7886" stroke="#3a4250" strokeWidth="2" />
      <polygon points="14,168 26,160 36,172 28,186 14,182" fill="#6d7886" stroke="#3a4250" strokeWidth="2" />

      {/* base de pedra */}
      <path d="M40 120 L280 120 L300 150 L300 214 L274 240 L46 240 L20 214 L20 150 Z" fill="url(#hs)" stroke="#232a36" strokeWidth="3" strokeLinejoin="round" />
      <path d="M20 150 L300 150" stroke="rgba(255,255,255,0.18)" strokeWidth="2" />
      <path d="M46 240 L274 240 L300 214 L20 214 Z" fill="rgba(0,0,0,0.25)" />

      {/* campo */}
      <rect x="36" y="82" width="248" height="150" rx="12" fill={theme.grass} stroke="#232a36" strokeWidth="3" />
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <rect key={i} x={36 + i * 41.3} y="82" width="20.6" height="150" fill={theme.grassAlt} opacity="0.55" />
      ))}
      {/* pistas */}
      <rect x="84" y="94" width="22" height="126" rx="6" fill={theme.path} stroke={theme.pathEdge} strokeWidth="2" />
      <rect x="214" y="94" width="22" height="126" rx="6" fill={theme.path} stroke={theme.pathEdge} strokeWidth="2" />
      {/* rio */}
      <rect x="36" y="146" width="248" height="22" fill="url(#hw)" stroke={theme.waterEdge} strokeWidth="2" />
      <path d="M52 154 h18 M110 160 h22 M170 153 h20 M226 160 h24" stroke={theme.waterLine} strokeWidth="2" strokeLinecap="round" />
      {/* pontes */}
      {[95, 225].map((x) => (
        <g key={x}>
          <rect x={x - 15} y="142" width="30" height="30" rx="3" fill="#b27a40" stroke="#6b4423" strokeWidth="2.5" />
          {[-8, 0, 8].map((d) => (
            <line key={d} x1={x + d} y1="143" x2={x + d} y2="171" stroke="#7d5128" strokeWidth="1.5" />
          ))}
        </g>
      ))}
      {/* torres do adversário (em cima, vermelhas) e as suas (embaixo, azuis) */}
      {tower(95, 112, "#d63a3a", "#9b2323")}
      {tower(225, 112, "#d63a3a", "#9b2323")}
      {tower(160, 100, "#d63a3a", "#9b2323", true)}
      {tower(95, 204, "#2f6fe0", "#1e4aa3")}
      {tower(225, 204, "#2f6fe0", "#1e4aa3")}
      {tower(160, 216, "#2f6fe0", "#1e4aa3", true)}

      {/* escudo com espadas cruzadas */}
      <g transform="translate(160 52)">
        <path d="M-30 -34 H30 V6 C30 24 12 36 0 42 C-12 36 -30 24 -30 6 Z" fill="url(#hshield)" stroke="#e5e7eb" strokeWidth="3.5" strokeLinejoin="round" />
        <g stroke="#1b2230" strokeWidth="2">
          <rect x="-4" y="-34" width="8" height="64" rx="3" fill="#f1f5f9" transform="rotate(45)" />
          <rect x="-4" y="-34" width="8" height="64" rx="3" fill="#f1f5f9" transform="rotate(-45)" />
          <rect x="-12" y="14" width="24" height="6" rx="2" fill="#facc15" transform="rotate(45) translate(0 -2)" />
          <rect x="-12" y="14" width="24" height="6" rx="2" fill="#facc15" transform="rotate(-45) translate(0 -2)" />
        </g>
        <circle cx="0" cy="0" r="5" fill="#facc15" stroke="#7c5a06" strokeWidth="1.5" />
      </g>

      {/* coroas laterais */}
      <g fill="#facc15" stroke="#7c5a06" strokeWidth="1.5" strokeLinejoin="round">
        <path d="M58 62 l6 -12 l8 8 l8 -10 l8 10 l8 -8 l6 12 z" transform="translate(-20 8) scale(0.9)" />
        <path d="M232 62 l6 -12 l8 8 l8 -10 l8 10 l8 -8 l6 12 z" transform="translate(26 8) scale(0.9)" />
      </g>
    </svg>
  );
}
