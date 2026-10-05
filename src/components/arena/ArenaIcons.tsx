import { useId } from "react";

// Ícones próprios da Arena dos Heróis (no lugar dos emojis): baús e a lamparina do XP.

type ChestVariant = "wood" | "gold" | "ark";

/** Baú de madeira (Baú da Arena), baú dourado (baús de troféus) ou a Arca da Aliança. */
export function ChestIcon({ variant = "wood", open = false, className = "h-10 w-auto" }: { variant?: ChestVariant; open?: boolean; className?: string }) {
  const id = useId().replace(/:/g, "");
  const wood = variant === "wood";
  const ark = variant === "ark";
  const body = wood ? ["#b97a3c", "#6b4423"] : ["#ffe27a", "#c98a14"];
  const band = wood ? "#f2c230" : ark ? "#fff3b0" : "#9a6a10";
  const stroke = wood ? "#3a2210" : "#7a4f0a";
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden>
      <defs>
        <linearGradient id={`b${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={body[0]} />
          <stop offset="1" stopColor={body[1]} />
        </linearGradient>
        <radialGradient id={`g${id}`} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#fff7c2" stopOpacity="0.95" />
          <stop offset="1" stopColor="#ffd23f" stopOpacity="0" />
        </radialGradient>
      </defs>
      {ark ? (
        <>
          {/* varais de carregar */}
          <rect x="2" y="47" width="60" height="4" rx="2" fill="#8a5a1d" stroke={stroke} strokeWidth="1.2" />
          <circle cx="6" cy="49" r="3" fill="#f2c230" stroke={stroke} strokeWidth="1" />
          <circle cx="58" cy="49" r="3" fill="#f2c230" stroke={stroke} strokeWidth="1" />
        </>
      ) : null}
      {open ? <circle cx="32" cy="30" r="26" fill={`url(#g${id})`} /> : null}
      {/* corpo */}
      <path d="M9 31 H55 V54 a3 3 0 0 1 -3 3 H12 a3 3 0 0 1 -3 -3 Z" fill={`url(#b${id})`} stroke={stroke} strokeWidth="2" strokeLinejoin="round" />
      <rect x="18" y="31" width="6" height="26" fill={band} opacity="0.9" />
      <rect x="40" y="31" width="6" height="26" fill={band} opacity="0.9" />
      {open ? (
        <>
          {/* tampa levantada e brilho de tesouro */}
          <path d="M9 31 L13 10 Q32 2 51 10 L55 31 Z" fill={`url(#b${id})`} stroke={stroke} strokeWidth="2" strokeLinejoin="round" transform="rotate(-8 9 31) translate(-3 -9)" />
          <ellipse cx="32" cy="31" rx="21" ry="3.5" fill="#fff2a0" />
          <circle cx="24" cy="27" r="3" fill="#ffd23f" stroke="#a8730a" strokeWidth="1" />
          <circle cx="33" cy="25" r="3.3" fill="#ffe27a" stroke="#a8730a" strokeWidth="1" />
          <circle cx="41" cy="27.5" r="2.8" fill="#ffd23f" stroke="#a8730a" strokeWidth="1" />
        </>
      ) : (
        <>
          <path d="M9 31 Q9 12 32 12 Q55 12 55 31 Z" fill={`url(#b${id})`} stroke={stroke} strokeWidth="2" strokeLinejoin="round" />
          <path d="M16 28 Q18 17 32 16" fill="none" stroke="#fff" strokeOpacity="0.35" strokeWidth="2.4" strokeLinecap="round" />
          <rect x="18" y="14.5" width="6" height="16.5" fill={band} opacity="0.9" />
          <rect x="40" y="14.5" width="6" height="16.5" fill={band} opacity="0.9" />
        </>
      )}
      {/* fecho */}
      {!open ? (
        <>
          <rect x="27" y="27" width="10" height="11" rx="2" fill="#ffd23f" stroke="#7a4f0a" strokeWidth="1.6" />
          <circle cx="32" cy="31.5" r="1.8" fill="#4a2f0a" />
          <rect x="31.2" y="32" width="1.6" height="4" rx="0.8" fill="#4a2f0a" />
        </>
      ) : null}
      {variant === "gold" ? (
        <>
          <circle cx="21" cy="46" r="2.6" fill="#38bdf8" stroke="#075985" strokeWidth="1" />
          <circle cx="43" cy="46" r="2.6" fill="#f472b6" stroke="#9d174d" strokeWidth="1" />
          {!open ? <circle cx="32" cy="19" r="2.8" fill="#38bdf8" stroke="#075985" strokeWidth="1" /> : null}
        </>
      ) : null}
      {ark && !open ? (
        <>
          {/* querubins de asas abertas sobre a tampa */}
          <path d="M31 14 C25 4 14 5 10 12 C16 10 22 12 31 20 Z" fill="#fffbe0" stroke={stroke} strokeWidth="1.4" strokeLinejoin="round" />
          <path d="M33 14 C39 4 50 5 54 12 C48 10 42 12 33 20 Z" fill="#fffbe0" stroke={stroke} strokeWidth="1.4" strokeLinejoin="round" />
        </>
      ) : null}
      {wood && !open ? <circle cx="12" cy="54" r="1.2" fill="#f2c230" /> : null}
    </svg>
  );
}

/** Lamparina de óleo acesa: o XP do dia ("lâmpada para os meus pés", Salmos 119:105). */
export function LampIcon({ className = "h-10 w-auto" }: { className?: string }) {
  const id = useId().replace(/:/g, "");
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden>
      <defs>
        <linearGradient id={`l${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#f6d278" />
          <stop offset="1" stopColor="#b9731a" />
        </linearGradient>
        <radialGradient id={`f${id}`} cx="0.5" cy="0.6" r="0.55">
          <stop offset="0" stopColor="#fff7c2" stopOpacity="0.9" />
          <stop offset="1" stopColor="#ffb02e" stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx="14" cy="22" r="17" fill={`url(#f${id})`} />
      {/* chama */}
      <path d="M14 8 C10 14 8 18 11 22 C12 24 16 24 17 22 C20 18 16 13 14 8 Z" fill="#ff8a1f" stroke="#c2410c" strokeWidth="1" strokeLinejoin="round" />
      <path d="M14 14 C12 17 12 20 14 22 C16 20 16 17 14 14 Z" fill="#fff0a8" />
      {/* bico e corpo */}
      <path d="M8 26 Q10 24 18 25 L24 28 H48 Q56 28 56 38 Q56 52 40 54 H26 Q10 52 10 38 Q10 33 17 30 Z" fill={`url(#l${id})`} stroke="#6b3f0a" strokeWidth="2" strokeLinejoin="round" />
      <path d="M14 36 Q16 31 26 31" fill="none" stroke="#fff" strokeOpacity="0.45" strokeWidth="2.4" strokeLinecap="round" />
      {/* alça */}
      <path d="M52 32 Q64 32 62 42 Q60 50 50 50" fill="none" stroke="#6b3f0a" strokeWidth="3.2" strokeLinecap="round" />
      <path d="M52 32 Q64 32 62 42 Q60 50 50 50" fill="none" stroke="#e2a63c" strokeWidth="1.4" strokeLinecap="round" />
      {/* tampa do óleo */}
      <ellipse cx="38" cy="27" rx="7" ry="3" fill="#e2a63c" stroke="#6b3f0a" strokeWidth="1.6" />
      <circle cx="38" cy="24.2" r="1.6" fill="#6b3f0a" />
      {/* base */}
      <rect x="22" y="53" width="22" height="5" rx="2" fill="#9c5f12" stroke="#6b3f0a" strokeWidth="1.4" />
    </svg>
  );
}
