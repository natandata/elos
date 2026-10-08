// Desenha no canvas o ícone da Arena no lugar de um emoji (mesma tabela do texto: ArenaText.tsx). Enquanto a imagem
// não chegou, ou se o emoji não tem ícone, cai no emoji comum — a animação nunca fica sem desenho.
import { ARENA_ICONS } from "./ArenaText";

const cache = new Map<string, HTMLImageElement>();

const iconOf = (glyph: string) => ARENA_ICONS[glyph.replace(/️/g, "")];

function load(name: string): HTMLImageElement {
  let im = cache.get(name);
  if (!im) {
    im = new Image();
    im.src = `/arena/icones/${name}.webp`;
    cache.set(name, im);
  }
  return im;
}

// os efeitos de batalha usam sempre os mesmos: já baixam junto com o campo
if (typeof window !== "undefined") for (const g of ["🔥", "☄️", "🌊", "📯", "⛪", "🏹", "🪨", "🍎", "🏺", "❔"]) load(iconOf(g));

/** Centraliza o ícone (ou o emoji) em (x, y) com `size` pixels. Usa o `ctx.font` atual na hora de cair no emoji. */
export function glyph(ctx: CanvasRenderingContext2D, g: string, x: number, y: number, size: number): void {
  const name = iconOf(g);
  if (name) {
    const im = load(name);
    if (im.complete && im.naturalWidth > 0) {
      const s = size * 1.15;
      ctx.drawImage(im, x - s / 2, y - s / 2, s, s);
      return;
    }
  }
  ctx.fillText(g, x, y);
}
