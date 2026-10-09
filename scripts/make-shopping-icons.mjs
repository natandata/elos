// Gera os ícones do Shopping Elos (SVG -> WebP 192px) no mesmo estilo dos ícones da Arena (contorno marrom escuro, brilho, tons quentes)
// e copia para public/shopping/icones os ícones da Arena que o shopping reaproveita.
// Rodar: node scripts/make-shopping-icons.mjs
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const OUT = path.resolve("public/shopping/icones");
fs.mkdirSync(OUT, { recursive: true });
const O = "#3a2415"; // contorno
let gid = 0;
/** gradiente vertical claro->escuro */
const grad = (c1, c2) => {
  const id = `g${gid++}`;
  return { id, def: `<linearGradient id="${id}" x1="0" y1="0" x2="0.3" y2="1"><stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/></linearGradient>`, fill: `url(#${id})` };
};
const mk = (body, defs = "") => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128"><defs>${defs}</defs>${body}</svg>`;
const st = `stroke="${O}" stroke-width="4.5" stroke-linejoin="round" stroke-linecap="round"`;
const shine = (d, o = 0.55) => `<path d="${d}" fill="#fff" opacity="${o}"/>`;

const icons = {};
const add = (name, fn) => {
  const defs = [];
  const G = (a, b) => {
    const g = grad(a, b);
    defs.push(g.def);
    return g.fill;
  };
  icons[name] = mk(fn(G), defs.join(""));
};

// ---------------------------------------------------------------- roupas e acessórios
add("vestido", (G) => `
  <path d="M50 14 L60 22 L68 22 L78 14 L84 34 L74 40 L92 108 Q64 118 36 108 L54 40 L44 34 Z" fill="${G("#ff9ac8", "#c2377f")}" ${st}/>
  <path d="M54 40 Q64 48 74 40" fill="none" ${st}/>
  <path d="M48 58 Q64 66 80 58" fill="none" stroke="#ffe08a" stroke-width="5" stroke-linecap="round"/>
  ${shine("M52 44 L60 100 L54 100 Z", 0.4)}`);
add("manto", (G) => `
  <path d="M44 16 Q64 8 84 16 L102 110 Q64 122 26 110 Z" fill="${G("#a98bf0", "#5a35b0")}" ${st}/>
  <path d="M44 16 Q64 30 84 16" fill="none" ${st}/>
  <circle cx="64" cy="26" r="7" fill="${G("#ffe08a", "#d69a1a")}" ${st}/>
  <path d="M30 100 Q64 110 98 100" fill="none" stroke="#ffe08a" stroke-width="5" stroke-linecap="round"/>
  ${shine("M40 30 L34 96 L42 98 Z", 0.35)}`);
add("sapato", (G) => `
  <path d="M18 78 Q18 54 34 50 L52 52 Q60 70 82 74 Q112 78 112 96 L112 102 L18 102 Z" fill="${G("#ff7aa8", "#b52a5e")}" ${st}/>
  <path d="M18 92 L112 92" stroke="${O}" stroke-width="4.5"/>
  <rect x="18" y="98" width="94" height="10" rx="4" fill="${G("#7a4a2a", "#3e2312")}" ${st}/>
  <path d="M26 66 Q30 58 40 58" fill="none" stroke="#fff" stroke-width="4" opacity="0.6" stroke-linecap="round"/>`);
add("varinha", (G) => `
  <path d="M26 104 L82 48" stroke="${O}" stroke-width="16" stroke-linecap="round"/>
  <path d="M26 104 L82 48" stroke="${G("#c78a4c", "#7a4a2a")}" stroke-width="9" stroke-linecap="round"/>
  <path d="M92 18 L98 36 L116 40 L100 50 L104 68 L92 56 L78 68 L82 50 L68 40 L86 36 Z" fill="${G("#fff2a8", "#f0b323")}" ${st}/>`);
add("colar", (G) => `
  <path d="M26 22 Q64 118 102 22" fill="none" stroke="${O}" stroke-width="10" stroke-linecap="round"/>
  <path d="M26 22 Q64 118 102 22" fill="none" stroke="${G("#ffe9a0", "#d99a1c")}" stroke-width="5" stroke-linecap="round"/>
  <path d="M64 82 L78 96 L64 116 L50 96 Z" fill="${G("#9be8ff", "#2a86c8")}" ${st}/>
  ${shine("M60 90 L64 86 L68 92 Z", 0.8)}`);
add("brinco", (G) => `
  <circle cx="64" cy="22" r="9" fill="${G("#ffe9a0", "#d99a1c")}" ${st}/>
  <path d="M64 30 L64 52" stroke="${O}" stroke-width="5"/>
  <path d="M64 50 C40 62 44 96 64 112 C84 96 88 62 64 50 Z" fill="${G("#b9a4ff", "#5b3fc4")}" ${st}/>
  ${shine("M54 66 Q50 84 58 98 Q52 84 56 66 Z", 0.6)}`);
add("pulseira", (G) => `
  <ellipse cx="64" cy="66" rx="42" ry="30" fill="none" stroke="${O}" stroke-width="22"/>
  <ellipse cx="64" cy="66" rx="42" ry="30" fill="none" stroke="${G("#ffe9a0", "#d99a1c")}" stroke-width="13"/>
  <circle cx="64" cy="37" r="9" fill="${G("#ff9ac8", "#c2377f")}" ${st}/>
  <path d="M30 56 Q40 42 56 38" fill="none" stroke="#fff" stroke-width="4" opacity="0.6" stroke-linecap="round"/>`);
add("bilhete", (G) => `
  <path d="M10 38 L118 38 L118 54 Q106 62 118 72 L118 90 L10 90 L10 72 Q22 62 10 54 Z" fill="${G("#ffe27a", "#e0a014")}" ${st} transform="rotate(-10 64 64)"/>
  <g transform="rotate(-10 64 64)"><path d="M82 44 L82 84" stroke="${O}" stroke-width="3.5" stroke-dasharray="5 5"/>
  <path d="M40 52 L45 62 L56 63 L48 70 L50 81 L40 76 L30 81 L32 70 L24 63 L35 62 Z" fill="${G("#fff", "#ffd9a0")}" stroke="${O}" stroke-width="3" stroke-linejoin="round"/>
  <path d="M92 56 L106 56 M92 66 L106 66 M92 76 L102 76" stroke="${O}" stroke-width="4" stroke-linecap="round"/></g>`);
add("cadeira", (G) => `
  <path d="M38 14 L46 14 L50 62 L38 62 Z" fill="${G("#c78a4c", "#7a4a2a")}" ${st}/>
  <rect x="34" y="58" width="64" height="16" rx="5" fill="${G("#e0a868", "#8a5a30")}" ${st}/>
  <path d="M42 72 L38 112 M92 72 L96 112 M60 74 L58 108 M80 74 L82 108" stroke="${O}" stroke-width="9" stroke-linecap="round"/>
  <path d="M42 72 L38 112 M92 72 L96 112" stroke="${G("#c78a4c", "#7a4a2a")}" stroke-width="4" stroke-linecap="round"/>`);
add("talheres", (G) => `
  <path d="M36 12 L36 44 Q36 54 44 54 L44 116 L52 116 L52 54 Q60 54 60 44 L60 12 M48 12 L48 44" fill="none" stroke="${O}" stroke-width="10" stroke-linejoin="round" stroke-linecap="round"/>
  <path d="M36 12 L36 44 Q36 54 44 54 L44 116 L52 116 L52 54 Q60 54 60 44 L60 12 M48 12 L48 44" fill="none" stroke="${G("#f4f6fa", "#a9b2c2")}" stroke-width="4.5" stroke-linejoin="round" stroke-linecap="round"/>
  <path d="M86 12 Q104 28 96 60 L92 64 L92 116 L84 116 L84 64 Q76 40 86 12 Z" fill="${G("#f4f6fa", "#a9b2c2")}" ${st}/>`);
add("balao", (G) => `
  <path d="M20 26 Q20 14 34 14 L94 14 Q108 14 108 26 L108 70 Q108 82 94 82 L66 82 L44 106 L46 82 L34 82 Q20 82 20 70 Z" fill="${G("#ffffff", "#c9d2e6")}" ${st}/>
  <circle cx="44" cy="48" r="6.5" fill="${O}"/><circle cx="64" cy="48" r="6.5" fill="${O}"/><circle cx="84" cy="48" r="6.5" fill="${O}"/>`);
add("sacola", (G) => `
  <path d="M32 40 L96 40 L104 112 L24 112 Z" fill="${G("#ff8fb8", "#c2377f")}" ${st}/>
  <path d="M48 46 L48 30 Q48 14 64 14 Q80 14 80 30 L80 46" fill="none" stroke="${O}" stroke-width="9" stroke-linecap="round"/>
  <path d="M48 46 L48 30 Q48 14 64 14 Q80 14 80 30 L80 46" fill="none" stroke="#ffe08a" stroke-width="4" stroke-linecap="round"/>
  <path d="M52 72 L58 80 L68 66 L76 78" fill="none" stroke="#fff" stroke-width="5" stroke-linecap="round" stroke-linejoin="round" opacity="0.8"/>
  ${shine("M38 48 L34 104 L42 104 Z", 0.35)}`);
add("escada", (G) => `
  <path d="M12 104 L12 90 L36 90 L36 72 L60 72 L60 54 L84 54 L84 36 L108 36 L108 104 Z" fill="${G("#c9d2e6", "#6f7a96")}" ${st}/>
  <path d="M20 84 L56 52 L88 26" fill="none" stroke="${O}" stroke-width="7" stroke-linecap="round"/>
  <path d="M20 84 L56 52 L88 26" fill="none" stroke="#ffd23f" stroke-width="3.5" stroke-linecap="round"/>`);
add("doce", (G) => `
  <path d="M30 52 L12 34 L12 72 Z M98 52 L116 34 L116 72 Z" fill="${G("#fff2a8", "#e8a321")}" ${st}/>
  <ellipse cx="64" cy="52" rx="40" ry="30" fill="${G("#ff8fb8", "#c2377f")}" ${st}/>
  <path d="M40 30 Q56 52 40 76 M64 24 Q80 52 64 80 M88 30 Q100 52 90 74" fill="none" stroke="#fff" stroke-width="5" opacity="0.7"/>`);
add("ursinho", (G) => `
  <circle cx="34" cy="30" r="14" fill="${G("#d9a066", "#8a5a30")}" ${st}/><circle cx="94" cy="30" r="14" fill="${G("#d9a066", "#8a5a30")}" ${st}/>
  <circle cx="64" cy="58" r="38" fill="${G("#e0a868", "#8a5a30")}" ${st}/>
  <ellipse cx="64" cy="70" rx="17" ry="13" fill="${G("#f6d9b0", "#caa070")}" ${st}/>
  <circle cx="50" cy="52" r="5" fill="${O}"/><circle cx="78" cy="52" r="5" fill="${O}"/><ellipse cx="64" cy="66" rx="5" ry="4" fill="${O}"/>
  <path d="M30 100 Q64 126 98 100" fill="${G("#ff8fb8", "#c2377f")}" ${st}/>`);
add("oculos", (G) => `
  <circle cx="36" cy="64" r="22" fill="${G("#e6f7ff", "#8fd0f0")}" opacity="0.9" ${st}/><circle cx="92" cy="64" r="22" fill="${G("#e6f7ff", "#8fd0f0")}" opacity="0.9" ${st}/>
  <path d="M58 60 Q64 52 70 60" fill="none" ${st}/><path d="M14 58 L4 48 M114 58 L124 48" ${st}/>
  <path d="M24 56 Q28 48 38 48" fill="none" stroke="#fff" stroke-width="4" stroke-linecap="round"/>`);

// ---------------------------------------------------------------- comida
add("pizza", (G) => `
  <path d="M64 114 L14 30 Q64 8 114 30 Z" fill="${G("#ffd36b", "#e0952a")}" ${st}/>
  <path d="M14 30 Q64 8 114 30" fill="none" stroke="${O}" stroke-width="9" stroke-linecap="round"/>
  <circle cx="44" cy="44" r="9" fill="${G("#ff6b5a", "#b52a1e")}" ${st}/><circle cx="76" cy="46" r="9" fill="${G("#ff6b5a", "#b52a1e")}" ${st}/><circle cx="60" cy="72" r="9" fill="${G("#ff6b5a", "#b52a1e")}" ${st}/>
  <path d="M52 26 Q60 32 70 26" fill="none" stroke="#5aa84a" stroke-width="5" stroke-linecap="round"/>`);
add("calzone", (G) => `
  <path d="M12 86 Q14 34 64 28 Q114 34 116 86 Q64 104 12 86 Z" fill="${G("#f0b860", "#b8741e")}" ${st}/>
  <path d="M20 84 Q64 98 108 84" fill="none" stroke="${O}" stroke-width="4.5" stroke-dasharray="3 8" stroke-linecap="round"/>
  <path d="M34 54 Q44 44 60 42" fill="none" stroke="#fff" stroke-width="5" opacity="0.6" stroke-linecap="round"/>
  <circle cx="82" cy="58" r="3.5" fill="#8a4a18"/><circle cx="70" cy="70" r="3.5" fill="#8a4a18"/><circle cx="92" cy="72" r="3.5" fill="#8a4a18"/>`);
add("espetinho", (G) => `
  <path d="M14 114 L112 16" stroke="${O}" stroke-width="9" stroke-linecap="round"/><path d="M14 114 L112 16" stroke="#d9c7a0" stroke-width="4" stroke-linecap="round"/>
  <g transform="rotate(-45 64 64)"><rect x="42" y="38" width="22" height="26" rx="8" fill="${G("#d9704a", "#8a2e18")}" ${st}/><rect x="42" y="66" width="22" height="22" rx="8" fill="${G("#8fcf60", "#3f7a2a")}" ${st}/><rect x="42" y="90" width="22" height="26" rx="8" fill="${G("#d9704a", "#8a2e18")}" ${st}/></g>`);
add("picanha", (G) => `
  <ellipse cx="64" cy="88" rx="52" ry="22" fill="${G("#ffffff", "#c9d2e6")}" ${st}/>
  <path d="M22 72 Q24 36 64 32 Q106 36 106 72 Q94 90 64 90 Q34 90 22 72 Z" fill="${G("#c0603a", "#6e2a14")}" ${st}/>
  <path d="M34 56 Q64 44 94 56 M32 68 Q64 56 96 68" fill="none" stroke="#3a1608" stroke-width="4.5" stroke-linecap="round"/>
  <path d="M40 46 Q52 38 66 38" fill="none" stroke="#fff" stroke-width="4" opacity="0.5" stroke-linecap="round"/>
  <path d="M82 34 Q90 20 100 18" fill="none" stroke="#5aa84a" stroke-width="5" stroke-linecap="round"/>`);
add("prato", (G) => `
  <ellipse cx="64" cy="82" rx="54" ry="24" fill="${G("#ffffff", "#c9d2e6")}" ${st}/>
  <path d="M24 74 Q30 40 64 38 Q98 40 104 74 Q64 92 24 74 Z" fill="${G("#fff2c0", "#e8c46a")}" ${st}/>
  <ellipse cx="46" cy="62" rx="14" ry="10" fill="${G("#7a4a2a", "#3e2312")}" ${st}/><ellipse cx="82" cy="62" rx="14" ry="10" fill="${G("#7a4a2a", "#3e2312")}" ${st}/>
  <path d="M54 48 Q64 40 76 48" fill="none" stroke="#d9a028" stroke-width="6" stroke-linecap="round"/>`);
add("refri", (G) => `
  <path d="M30 34 L98 34 L90 114 L38 114 Z" fill="${G("#ffb4a0", "#d9382a")}" ${st}/>
  <rect x="26" y="26" width="76" height="12" rx="5" fill="${G("#ffffff", "#c9d2e6")}" ${st}/>
  <path d="M72 26 L84 6 L100 6" fill="none" stroke="${O}" stroke-width="8" stroke-linecap="round"/><path d="M72 26 L84 6 L100 6" fill="none" stroke="#ffd23f" stroke-width="3.5" stroke-linecap="round"/>
  <path d="M40 52 L36 100" stroke="#fff" stroke-width="5" opacity="0.5" stroke-linecap="round"/><circle cx="64" cy="72" r="10" fill="#fff" opacity="0.85"/>`);
add("guarana", (G) => `
  <rect x="34" y="14" width="60" height="100" rx="10" fill="${G("#7fe08a", "#1f8a3a")}" ${st}/>
  <rect x="34" y="14" width="60" height="14" rx="6" fill="${G("#f4f6fa", "#a9b2c2")}" ${st}/>
  <circle cx="64" cy="70" r="20" fill="${G("#ff6b5a", "#b52a1e")}" ${st}/><circle cx="64" cy="70" r="7" fill="#3a1608"/>
  <path d="M42 36 L42 100" stroke="#fff" stroke-width="5" opacity="0.5" stroke-linecap="round"/>`);
add("sorvete", (G) => `
  <path d="M38 62 L64 118 L90 62 Z" fill="${G("#f0b860", "#b8741e")}" ${st}/>
  <path d="M46 68 L82 100 M60 66 L70 106 M80 66 L50 100" stroke="${O}" stroke-width="3" opacity="0.7"/>
  <circle cx="64" cy="48" r="26" fill="${G("#ffc2dd", "#e0558f")}" ${st}/>
  <circle cx="44" cy="62" r="14" fill="${G("#fff2d0", "#e0b878")}" ${st}/><circle cx="86" cy="62" r="14" fill="${G("#a9e8d4", "#3aa890")}" ${st}/>
  <circle cx="64" cy="22" r="7" fill="${G("#ff6b5a", "#b52a1e")}" ${st}/>`);
add("milkshake", (G) => `
  <path d="M34 36 L94 36 L84 112 L44 112 Z" fill="${G("#fff2f6", "#f0a8c8")}" ${st}/>
  <path d="M30 36 Q30 10 64 10 Q98 10 98 36 Z" fill="${G("#ffffff", "#e6d4dc")}" ${st}/>
  <circle cx="64" cy="10" r="9" fill="${G("#ff6b5a", "#b52a1e")}" ${st}/>
  <path d="M78 16 L92 -2" stroke="${O}" stroke-width="7" stroke-linecap="round"/>
  <path d="M46 52 L50 98" stroke="#fff" stroke-width="5" opacity="0.7" stroke-linecap="round"/>`);
add("acai", (G) => `
  <path d="M12 52 L116 52 Q112 112 64 114 Q16 112 12 52 Z" fill="${G("#f4f6fa", "#a9b2c2")}" ${st}/>
  <ellipse cx="64" cy="50" rx="52" ry="18" fill="${G("#a05ac8", "#4a1a78")}" ${st}/>
  <circle cx="44" cy="46" r="8" fill="${G("#fff2a8", "#f0c030")}" ${st}/><circle cx="68" cy="44" r="8" fill="${G("#ff9ac8", "#c2377f")}" ${st}/><circle cx="88" cy="50" r="8" fill="${G("#9be8a0", "#3a9a4a")}" ${st}/>`);
add("picole", (G) => `
  <rect x="56" y="78" width="16" height="42" rx="6" fill="${G("#e8c88a", "#a8783a")}" ${st}/>
  <path d="M34 78 L34 36 Q34 10 64 10 Q94 10 94 36 L94 78 Z" fill="${G("#ff8fb8", "#8a5ae0")}" ${st}/>
  <path d="M44 66 L44 36 Q44 22 56 20" fill="none" stroke="#fff" stroke-width="5" opacity="0.6" stroke-linecap="round"/>`);
add("torta", (G) => `
  <path d="M10 94 L114 94 L114 108 L10 108 Z" fill="${G("#ffffff", "#c9d2e6")}" ${st}/>
  <path d="M14 94 L64 36 L114 94 Z" fill="${G("#f0b860", "#b8741e")}" ${st}/>
  <path d="M30 82 L64 52 L98 82" fill="none" stroke="${G("#a05a2a", "#5a2a10")}" stroke-width="10" stroke-linecap="round"/>
  <circle cx="64" cy="40" r="8" fill="${G("#ff6b5a", "#b52a1e")}" ${st}/>`);
add("crepe", (G) => `
  <ellipse cx="64" cy="92" rx="54" ry="20" fill="${G("#ffffff", "#c9d2e6")}" ${st}/>
  <path d="M16 84 Q22 44 64 38 Q106 44 112 84 Q64 102 16 84 Z" fill="${G("#f4cf86", "#c08a30")}" ${st}/>
  <path d="M30 66 Q64 80 98 66" fill="none" stroke="#6e3a18" stroke-width="7" stroke-linecap="round"/>
  <circle cx="48" cy="52" r="7" fill="${G("#ff6b5a", "#b52a1e")}" ${st}/><circle cx="76" cy="50" r="7" fill="${G("#ff6b5a", "#b52a1e")}" ${st}/>`);
add("suco", (G) => `
  <path d="M30 24 L98 24 L90 112 L38 112 Z" fill="${G("#ffd36b", "#e87a14")}" ${st}/>
  <path d="M30 24 L98 24 L96 40 L32 40 Z" fill="${G("#fff2d0", "#e8c890")}" ${st}/>
  <circle cx="92" cy="24" r="16" fill="${G("#ffc060", "#e87a14")}" ${st}/><path d="M92 14 L92 34 M82 24 L102 24" stroke="${O}" stroke-width="3"/>
  <path d="M42 54 L46 98" stroke="#fff" stroke-width="5" opacity="0.6" stroke-linecap="round"/>`);
add("paoqueijo", (G) => `
  <ellipse cx="64" cy="70" rx="46" ry="38" fill="${G("#ffd98a", "#d99a30")}" ${st}/>
  <path d="M30 60 Q40 38 64 36" fill="none" stroke="#fff" stroke-width="6" opacity="0.6" stroke-linecap="round"/>
  <path d="M44 76 Q56 62 70 74 Q84 84 92 70" fill="none" stroke="#b86a14" stroke-width="5" stroke-linecap="round"/>
  <circle cx="54" cy="52" r="5" fill="#fff2a8" stroke="${O}" stroke-width="2.5"/><circle cx="80" cy="56" r="5" fill="#fff2a8" stroke="${O}" stroke-width="2.5"/>`);
add("bolomilho", (G) => `
  <path d="M10 100 L118 100 L118 112 L10 112 Z" fill="${G("#ffffff", "#c9d2e6")}" ${st}/>
  <path d="M16 100 L16 56 Q16 36 40 36 L88 36 Q112 36 112 56 L112 100 Z" fill="${G("#ffe27a", "#e0a014")}" ${st}/>
  <path d="M16 56 Q64 72 112 56" fill="none" stroke="#fff" stroke-width="7" opacity="0.8" stroke-linecap="round"/>
  <circle cx="64" cy="26" r="6" fill="#ff6b5a" stroke="${O}" stroke-width="3"/>`);

for (const [name, svg] of Object.entries(icons)) {
  await sharp(Buffer.from(svg)).resize(192, 192).webp({ quality: 92 }).toFile(path.join(OUT, `${name}.webp`));
}
// ícones da Arena reaproveitados (cópia para o mesmo diretório)
const ARENA = "public/arena/icones";
const reuse = ["nota", "trofeu", "bussola", "play", "raio", "bolsa", "dupla", "porta", "som", "mudo", "coroa", "coroa-rubi", "anel", "estrela", "brilhos", "fogo", "certo", "x", "cadeado", "cadeado-aberto", "presente", "megafone", "livros", "livro", "gota", "cronometro", "ampulheta", "pergaminho", "flor", "cafe", "croissant", "pao", "maca", "seta-cima", "seta-baixo", "voltar", "mais", "interrogacao", "casa", "castelo", "moeda", "bota", "controle", "lupa", "alerta", "medalha", "trofeu", "templo", "tenda", "chave", "lampada", "sino", "festa", "coracao", "ovelha", "trigo", "vaso", "dedo", "play", "confete", "cometa", "cetro-chave", "capacete"];
for (const n of reuse) {
  const src = path.join(ARENA, `${n}.webp`);
  if (fs.existsSync(src)) fs.copyFileSync(src, path.join(OUT, `${n}.webp`));
  else console.log("sem ícone da arena:", n);
}
console.log("ícones novos:", Object.keys(icons).length);
