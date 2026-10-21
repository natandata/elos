// Emblemas das tribos (escudos em SVG). Usados na interface (como imagem) e na vila (desenhados no canvas).

import type { TribeKey } from "@/lib/tribos/data";

const SHIELD = "M50 4 L92 16 V56 C92 88 70 108 50 116 C30 108 8 88 8 56 V16 Z";
const INNER = "M50 11 L85 21 V56 C85 83 67 100 50 108 C33 100 15 83 15 56 V21 Z";

function frame(id: string, c1: string, c2: string, art: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 120">
<defs>
<linearGradient id="f${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/></linearGradient>
<linearGradient id="g${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff0a8"/><stop offset="0.5" stop-color="#e6b422"/><stop offset="1" stop-color="#8a5a00"/></linearGradient>
<clipPath id="c${id}"><path d="${INNER}"/></clipPath>
</defs>
<path d="${SHIELD}" fill="url(#g${id})" stroke="#3a2600" stroke-width="3" stroke-linejoin="round"/>
<path d="${INNER}" fill="url(#f${id})" stroke="#3a2600" stroke-width="1.5"/>
<g clip-path="url(#c${id})">${art}
<path d="${INNER}" fill="none" stroke="#fff" stroke-opacity="0.28" stroke-width="3"/>
<ellipse cx="38" cy="26" rx="26" ry="10" fill="#fff" opacity="0.16" transform="rotate(-18 38 26)"/>
</g>
</svg>`;
}

const JAGUAR = `
<circle cx="29" cy="33" r="10" fill="#f0a410" stroke="#2a1700" stroke-width="2"/><circle cx="29" cy="34" r="4.5" fill="#6a3a10"/>
<circle cx="71" cy="33" r="10" fill="#f0a410" stroke="#2a1700" stroke-width="2"/><circle cx="71" cy="34" r="4.5" fill="#6a3a10"/>
<ellipse cx="50" cy="58" rx="27" ry="25" fill="#f6b21c" stroke="#2a1700" stroke-width="2.5"/>
<g fill="#2a1700">
<ellipse cx="36" cy="42" rx="2.6" ry="1.8"/><ellipse cx="44" cy="38" rx="2.2" ry="1.6"/><ellipse cx="56" cy="38" rx="2.2" ry="1.6"/><ellipse cx="64" cy="42" rx="2.6" ry="1.8"/>
<ellipse cx="29" cy="55" rx="2.4" ry="1.7"/><ellipse cx="71" cy="55" rx="2.4" ry="1.7"/><ellipse cx="31" cy="64" rx="2" ry="1.5"/><ellipse cx="69" cy="64" rx="2" ry="1.5"/>
<path d="M50 34 V44" stroke="#2a1700" stroke-width="2.4" stroke-linecap="round"/>
</g>
<ellipse cx="50" cy="68" rx="15" ry="11" fill="#ffe9ae" stroke="#2a1700" stroke-width="2"/>
<g><path d="M35 53 Q40 47 46 54 Q41 58 35 53Z" fill="#c8f060" stroke="#2a1700" stroke-width="2"/><path d="M65 53 Q60 47 54 54 Q59 58 65 53Z" fill="#c8f060" stroke="#2a1700" stroke-width="2"/>
<ellipse cx="41" cy="53" rx="1.6" ry="3.2" fill="#1a0e00"/><ellipse cx="59" cy="53" rx="1.6" ry="3.2" fill="#1a0e00"/></g>
<path d="M44 62 H56 L50 69 Z" fill="#d6567a" stroke="#2a1700" stroke-width="2" stroke-linejoin="round"/>
<path d="M50 69 V73 M50 73 Q44 78 39 74 M50 73 Q56 78 61 74" fill="none" stroke="#2a1700" stroke-width="2" stroke-linecap="round"/>
<path d="M44 76 L46 82 L48 76 M52 76 L54 82 L56 76" fill="#fff" stroke="#2a1700" stroke-width="1.4" stroke-linejoin="round"/>`;

const SHARK = `
<path d="M0 88 Q25 80 50 88 T100 88 V120 H0Z" fill="#0d5a35" opacity="0.55"/>
<path d="M8 62 C20 42 52 34 78 48 L92 36 L90 58 L96 74 L80 66 C62 84 28 86 8 62Z" fill="#8fb3c4" stroke="#0e2b36" stroke-width="2.5" stroke-linejoin="round"/>
<path d="M10 66 C30 82 62 82 80 66 L72 60 C54 72 28 72 12 62Z" fill="#e7f2f6" stroke="#0e2b36" stroke-width="1.5" stroke-linejoin="round"/>
<path d="M38 46 L50 22 L58 47Z" fill="#7aa0b2" stroke="#0e2b36" stroke-width="2.5" stroke-linejoin="round"/>
<path d="M44 70 L56 84 L60 70Z" fill="#7aa0b2" stroke="#0e2b36" stroke-width="2" stroke-linejoin="round"/>
<circle cx="25" cy="56" r="5" fill="#fff" stroke="#0e2b36" stroke-width="2"/><circle cx="25.8" cy="56.3" r="2.4" fill="#0a1a22"/>
<g fill="none" stroke="#0e2b36" stroke-width="1.8" stroke-linecap="round"><path d="M40 56 q3 4 0 9"/><path d="M45 55 q3 4 0 10"/><path d="M50 55 q3 4 0 9"/></g>
<path d="M9 63 Q22 70 36 68" fill="none" stroke="#0e2b36" stroke-width="2.2" stroke-linecap="round"/>
<path d="M12 64 L15 70 L18 66 L21 71 L24 67 L27 72 L30 68 L33 71 L35 67" fill="#fff" stroke="#0e2b36" stroke-width="1.3" stroke-linejoin="round"/>`;

const PANDA = `
<circle cx="29" cy="33" r="11" fill="#1a1414" stroke="#0a0606" stroke-width="2"/><circle cx="71" cy="33" r="11" fill="#1a1414" stroke="#0a0606" stroke-width="2"/>
<ellipse cx="50" cy="58" rx="29" ry="26" fill="#fbf7f0" stroke="#1a1414" stroke-width="2.5"/>
<ellipse cx="37" cy="56" rx="8" ry="10.5" fill="#1a1414" transform="rotate(24 37 56)"/><ellipse cx="63" cy="56" rx="8" ry="10.5" fill="#1a1414" transform="rotate(-24 63 56)"/>
<circle cx="38" cy="55" r="3.2" fill="#fff"/><circle cx="62" cy="55" r="3.2" fill="#fff"/><circle cx="38.6" cy="55.4" r="1.6" fill="#1a1414"/><circle cx="61.4" cy="55.4" r="1.6" fill="#1a1414"/>
<path d="M44 65 Q50 62 56 65 Q54 71 50 71 Q46 71 44 65Z" fill="#1a1414"/>
<path d="M50 71 V75 M50 75 Q45 80 40 76 M50 75 Q55 80 60 76" fill="none" stroke="#1a1414" stroke-width="2.2" stroke-linecap="round"/>
<path d="M68 90 Q80 70 86 46" stroke="#7bc043" stroke-width="5" fill="none" stroke-linecap="round"/><path d="M80 66 q10 -3 12 -10 q-9 1 -12 10Z" fill="#9ad65a" stroke="#356a1a" stroke-width="1"/>`;

const ART: Record<TribeKey, { c1: string; c2: string; art: string }> = {
  feras: { c1: "#e8a60a", c2: "#8a4e00", art: JAGUAR },
  bravos: { c1: "#2fbf6a", c2: "#0d5a35", art: SHARK },
  reliquias: { c1: "#ee5a52", c2: "#80201c", art: PANDA },
};

export const emblemSvg = (tribe: TribeKey): string => frame(tribe, ART[tribe].c1, ART[tribe].c2, ART[tribe].art);
export const emblemUrl = (tribe: TribeKey): string => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(emblemSvg(tribe))}`;
