import type { ReactNode } from "react";

export type EmblemKind = "friendly" | "cup" | "brasileirao" | "career" | "duel" | "squad" | "teams";

const SHIELD = "M32 3 L57 11 V33 C57 47 46.5 56.5 32 61 C17.5 56.5 7 47 7 33 V11 Z";

const THEME: Record<EmblemKind, { a: string; b: string; ring: string }> = {
  friendly: { a: "#34d399", b: "#047857", ring: "#a7f3d0" },
  cup: { a: "#b45309", b: "#451a03", ring: "#fde68a" },
  brasileirao: { a: "#16a34a", b: "#064e3b", ring: "#fde047" },
  career: { a: "#8b5cf6", b: "#3b0764", ring: "#ddd6fe" },
  duel: { a: "#38bdf8", b: "#0c4a6e", ring: "#bae6fd" },
  squad: { a: "#f472b6", b: "#831843", ring: "#fbcfe8" },
  teams: { a: "#94a3b8", b: "#1e293b", ring: "#e2e8f0" },
};

function glyph(kind: EmblemKind): ReactNode {
  switch (kind) {
    case "friendly":
      return (
        <g>
          <circle cx="32" cy="32" r="14" fill="#fff" stroke="#052e16" strokeWidth="2" />
          <path d="M32 22.5 L39.5 28 L36.6 36.8 H27.4 L24.5 28 Z" fill="#052e16" />
          <path d="M32 22.5 V18.5 M39.5 28 L43.5 26.6 M36.6 36.8 L39 40.4 M27.4 36.8 L25 40.4 M24.5 28 L20.5 26.6" stroke="#052e16" strokeWidth="2" strokeLinecap="round" />
        </g>
      );
    case "cup":
      return (
        <g>
          <path d="M23 17h18v9c0 6.5-4 11-9 12-5-1-9-5.500-9-12v-9z" fill="#fde68a" stroke="#451a03" strokeWidth="2" strokeLinejoin="round" />
          <path d="M23 19h-6c0 6.500 2.500 10.500 7 11.500M41 19h6c0 6.500-2.500 10.500-7 11.500" fill="none" stroke="#fbbf24" strokeWidth="2.600" strokeLinecap="round" />
          <path d="M30 38h4v6h-4z" fill="#f59e0b" />
          <path d="M24 45h16l1.500 4.500h-19z" fill="#fde68a" stroke="#451a03" strokeWidth="2" strokeLinejoin="round" />
          <path d="M27 20v6c0 3 1.200 5.500 3.500 7" fill="none" stroke="#fff" strokeOpacity=".75" strokeWidth="2" strokeLinecap="round" />
        </g>
      );
    case "brasileirao":
      return (
        <g>
          <path d="M32 15 L51 32 L32 49 L13 32 Z" fill="#fde047" stroke="#064e3b" strokeWidth="2" strokeLinejoin="round" />
          <circle cx="32" cy="32" r="9.500" fill="#1d4ed8" stroke="#064e3b" strokeWidth="1.600" />
          <path d="M23 31c6-2.500 13-1.500 18.500 2.500" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
        </g>
      );
    case "career":
      return (
        <g>
          <path d="M32 11l3.300 7 7.700.9-5.700 5.200 1.600 7.600L32 27.800 25.100 31.700l1.600-7.600L21 18.900l7.700-.9z" fill="#fde047" stroke="#3b0764" strokeWidth="1.800" strokeLinejoin="round" />
          <rect x="16" y="46" width="7" height="6" rx="1.200" fill="#ddd6fe" />
          <rect x="28.500" y="40" width="7" height="12" rx="1.200" fill="#c4b5fd" />
          <rect x="41" y="34" width="7" height="18" rx="1.200" fill="#fff" />
        </g>
      );
    case "duel":
      return (
        <g>
          <path d="M14 22l10 10-10 10M50 22L40 32l10 10" fill="none" stroke="#fff" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
          <text x="32" y="37" textAnchor="middle" fontFamily="system-ui, sans-serif" fontSize="14" fontWeight="900" fontStyle="italic" fill="#fde047" stroke="#0c4a6e" strokeWidth=".8">
            VS
          </text>
        </g>
      );
    case "squad":
      return (
        <g fill="#fff" stroke="#831843" strokeWidth="1.600">
          <circle cx="32" cy="22" r="6" />
          <path d="M21 46c0-7 4.500-11 11-11s11 4 11 11z" />
          <circle cx="19" cy="27" r="4.500" fill="#fbcfe8" />
          <path d="M11 46c0-5.500 3-8.500 8-8.500 1.800 0 3.200.3 4.400 1" fill="#fbcfe8" />
          <circle cx="45" cy="27" r="4.500" fill="#fbcfe8" />
          <path d="M53 46c0-5.500-3-8.500-8-8.500-1.800 0-3.200.3-4.400 1" fill="#fbcfe8" />
        </g>
      );
    case "teams":
      return (
        <g>
          <rect x="17" y="14" width="30" height="36" rx="4" fill="#fff" stroke="#0f172a" strokeWidth="2" />
          <rect x="25" y="11" width="14" height="7" rx="2.500" fill="#cbd5e1" stroke="#0f172a" strokeWidth="2" />
          <circle cx="26" cy="27" r="4.500" fill="#38bdf8" stroke="#0f172a" strokeWidth="1.400" />
          <path d="M34 25h8M34 30h8M22 38h20M22 43h14" stroke="#475569" strokeWidth="2.200" strokeLinecap="round" />
        </g>
      );
  }
}

/** Emblema de cada item do menu: escudo com cor e símbolo próprios (desenhados aqui, sem imagem). */
export function MenuEmblem({ kind, size = 52 }: { kind: EmblemKind; size?: number }) {
  const t = THEME[kind];
  const id = `em-${kind}`;
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden className="shrink-0 drop-shadow-[0_3px_6px_rgba(0,0,0,0.55)]">
      <defs>
        <linearGradient id={`${id}-g`} x1="0" y1="0" x2="0.8" y2="1">
          <stop offset="0" stopColor={t.a} />
          <stop offset="1" stopColor={t.b} />
        </linearGradient>
        <linearGradient id={`${id}-s`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity=".5" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={SHIELD} fill={`url(#${id}-g)`} stroke={t.ring} strokeWidth="2.200" strokeLinejoin="round" />
      <path d="M32 7 L53 13.500 V28 C44 24 20 24 11 28 V13.500 Z" fill={`url(#${id}-s)`} />
      {glyph(kind)}
    </svg>
  );
}
