// Bab, a mascote do Babel: uma torre simpática de três andares, verde, com bandeirinha no topo. Desenho original, em SVG.
export type Mood = "happy" | "cheer" | "sad" | "worried" | "proud" | "think";

export function BabelMascot({ mood = "happy", className = "h-28 w-28" }: { mood?: Mood; className?: string }) {
  const up = mood === "cheer";
  const sad = mood === "sad";
  const worried = mood === "worried";
  return (
    <svg viewBox="0 0 120 140" className={className} aria-hidden>
      <ellipse cx="60" cy="133" rx="36" ry="5.500" fill="#000" opacity=".14" />

      {/* bandeirinha */}
      <path d="M60 24V4" stroke="#8a5a2b" strokeWidth="3" strokeLinecap="round" />
      <path d="M61.500 4.500L86 12.500L61.500 20.500z" fill="#ffc800" stroke="#e5b000" strokeWidth="1.500" strokeLinejoin="round" />

      {/* ameias */}
      {[37, 54.500, 72].map((x) => (
        <rect key={x} x={x} y="22" width="11" height="14" rx="3.500" fill="#6fd817" stroke="#58a700" strokeWidth="2" />
      ))}

      {/* andares */}
      <rect x="34" y="30" width="52" height="38" rx="12" fill="#6fd817" stroke="#58a700" strokeWidth="2.500" />
      <rect x="24" y="58" width="72" height="42" rx="15" fill="#58cc02" stroke="#58a700" strokeWidth="2.500" />
      <rect x="13" y="90" width="94" height="40" rx="17" fill="#4fbd00" stroke="#58a700" strokeWidth="2.500" />
      <path d="M26 118h14M52 121h16M80 118h14M40 108h12M68 108h12" stroke="#3f9600" strokeWidth="2.500" strokeLinecap="round" opacity=".55" />

      {/* braços */}
      {up ? (
        <>
          <ellipse cx="17" cy="62" rx="7" ry="11" fill="#58cc02" stroke="#58a700" strokeWidth="2.500" transform="rotate(25 17 62)" />
          <ellipse cx="103" cy="62" rx="7" ry="11" fill="#58cc02" stroke="#58a700" strokeWidth="2.500" transform="rotate(-25 103 62)" />
        </>
      ) : (
        <>
          <ellipse cx="18" cy="86" rx="7" ry="11" fill="#58cc02" stroke="#58a700" strokeWidth="2.500" transform={sad ? "rotate(8 18 86)" : "rotate(-12 18 86)"} />
          <ellipse cx="102" cy="86" rx="7" ry="11" fill="#58cc02" stroke="#58a700" strokeWidth="2.500" transform={sad ? "rotate(-8 102 86)" : "rotate(12 102 86)"} />
        </>
      )}

      {/* rosto */}
      <circle cx="47" cy="76" r="10.500" fill="#fff" />
      <circle cx="73" cy="76" r="10.500" fill="#fff" />
      {worried ? (
        <path d="M38 75q9 8 18 0M64 75q9 8 18 0" fill="none" stroke="#2b3a1a" strokeWidth="3.500" strokeLinecap="round" />
      ) : (
        <>
          <circle cx={mood === "think" ? 50 : 48} cy={mood === "think" ? 73 : 77} r="5.500" fill="#2b3a1a" />
          <circle cx={mood === "think" ? 76 : 74} cy={mood === "think" ? 73 : 77} r="5.500" fill="#2b3a1a" />
          <circle cx={mood === "think" ? 52 : 50} cy={mood === "think" ? 71 : 75} r="1.800" fill="#fff" />
          <circle cx={mood === "think" ? 78 : 76} cy={mood === "think" ? 71 : 75} r="1.800" fill="#fff" />
        </>
      )}
      {sad || worried ? (
        <path d="M37 67l17-5M83 67l-17-5" stroke="#2b3a1a" strokeWidth="3" strokeLinecap="round" />
      ) : mood === "think" ? (
        <path d="M65 62l16-3" stroke="#2b3a1a" strokeWidth="3" strokeLinecap="round" />
      ) : null}
      <ellipse cx="36" cy="88" rx="5" ry="3.200" fill="#ff8fa3" opacity=".55" />
      <ellipse cx="84" cy="88" rx="5" ry="3.200" fill="#ff8fa3" opacity=".55" />

      {/* boca */}
      {sad ? (
        <path d="M51 94q9-8 18 0" fill="none" stroke="#2b3a1a" strokeWidth="3.200" strokeLinecap="round" />
      ) : worried ? (
        <path d="M52 93q8-4 16 0" fill="none" stroke="#2b3a1a" strokeWidth="3.200" strokeLinecap="round" />
      ) : mood === "think" ? (
        <ellipse cx="60" cy="92" rx="3.500" ry="3" fill="#7a2b1f" />
      ) : mood === "proud" ? (
        <path d="M50 90q10 8 20 0" fill="none" stroke="#2b3a1a" strokeWidth="3.200" strokeLinecap="round" />
      ) : (
        <>
          <path d="M48 87q12 16 24 0z" fill="#7a2b1f" stroke="#2b3a1a" strokeWidth="2" strokeLinejoin="round" />
          <path d="M54 95q6-4 12 0q-6 3-12 0z" fill="#ff8fa3" />
        </>
      )}

      {sad ? <path d="M33 86q-3 6 0 9q3-3 0-9z" fill="#1cb0f6" /> : null}
      {up ? (
        <>
          <path d="M8 36l2 5 5 2-5 2-2 5-2-5-5-2 5-2z" fill="#ffc800" />
          <path d="M108 30l2 5 5 2-5 2-2 5-2-5-5-2 5-2z" fill="#ffc800" />
        </>
      ) : null}
      {worried ? <text x="92" y="48" fontSize="16" fontWeight="800" fill="#1cb0f6" fontFamily="sans-serif">z</text> : null}

      {/* pés */}
      <ellipse cx="42" cy="131" rx="12" ry="5.500" fill="#58a700" />
      <ellipse cx="78" cy="131" rx="12" ry="5.500" fill="#58a700" />
    </svg>
  );
}

/** Mascote falando: balão ao lado. */
export function MascotSays({ mood = "happy", children }: { mood?: Mood; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2">
      <BabelMascot mood={mood} className="h-24 w-20 shrink-0" />
      <div className="bb-bubble relative flex-1 !rounded-2xl text-[15px] leading-snug before:absolute before:-left-[9px] before:top-1/2 before:h-4 before:w-4 before:-translate-y-1/2 before:rotate-45 before:border-b-2 before:border-l-2 before:border-[var(--bb-line)] before:bg-[var(--bb-bg)] before:content-['']">
        {children}
      </div>
    </div>
  );
}
