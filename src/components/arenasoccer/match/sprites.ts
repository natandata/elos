// ArenaSoccer · jogadores em pixel art. As faixas de animação (public/arenasoccer/sprites/*.png) guardam um "papel" por pixel
// (pele, cabelo, camisa...) no canal vermelho; aqui o papel vira cor conforme o jogador (pele e cabelo do busto, camisa do time).
import looksData from "@/lib/arenasoccer/data/looks.json";
import metaData from "@/lib/arenasoccer/data/sprite-meta.json";
import type { Kit } from "@/lib/arenasoccer/teams";

export type Anim = "run" | "kick" | "header" | "celebrate";
export type Look = { skin: number; hair: number; style: number };
const LOOKS = looksData as unknown as Record<string, [number, number, number]>;

const FRAMES = 6;
// 8 tons de pele (do mais claro ao mais escuro): cor e sombra
const SKINS: [string, string][] = [
  ["#f7d9c4", "#dcb59a"],
  ["#efc3a1", "#d4a07c"],
  ["#dfa97a", "#c08a5e"],
  ["#c98e5f", "#a86f44"],
  ["#b07445", "#8e5630"],
  ["#8d5a34", "#6b3f20"],
  ["#6b4026", "#4a2a16"],
  ["#4a2c1a", "#321c0f"],
];
// preto, castanho, castanho-claro, loiro, ruivo, grisalho; o último (careca) usa a cor da pele
const HAIRS = ["#1a1a1a", "#3b2417", "#8a6238", "#dcc067", "#b4491f", "#c9c9c9", ""];
/** formatos: 0 careca, 1 raspado, 2 curto, 3 médio/topete, 4 cheio/crespo, 5 longo, 6 trança/dreads, 7 coque */
const META = metaData as unknown as Record<string, [number, number, number, number][]>;

type Sheet = { img: HTMLImageElement; cell: number; h: number };
const sheets = new Map<Anim, Sheet | "loading" | "failed">();
const cache = new Map<string, HTMLCanvasElement>();
const ROLE_COUNT = 9;

function load(anim: Anim): void {
  if (sheets.has(anim) || typeof window === "undefined") return;
  sheets.set(anim, "loading");
  const img = new Image();
  img.onload = () => {
    // atlas de máscaras: ROLE_COUNT faixas empilhadas, FRAMES quadros lado a lado
    const h = img.height / ROLE_COUNT;
    sheets.set(anim, h > 0 && img.width > 0 ? { img, cell: img.width / FRAMES, h } : "failed");
  };
  img.onerror = () => sheets.set(anim, "failed");
  img.src = `/arenasoccer/sprites/${anim}-mask.png`;
}

/** Começa a baixar todas as faixas (chame uma vez ao montar a cena). */
export function preloadSprites(): void {
  (["run", "kick", "header", "celebrate"] as Anim[]).forEach(load);
}

const hex = (h: string): [number, number, number] => {
  const v = h.length === 4 ? `#${h[1]}${h[1]}${h[2]}${h[2]}${h[3]}${h[3]}` : h;
  const n = [parseInt(v.slice(1, 3), 16), parseInt(v.slice(3, 5), 16), parseInt(v.slice(5, 7), 16)];
  return [n[0] || 0, n[1] || 0, n[2] || 0];
};
const shade = (rgb: [number, number, number], k: number): [number, number, number] => [Math.round(rgb[0] * k), Math.round(rgb[1] * k), Math.round(rgb[2] * k)];

const css = (c: [number, number, number]): string => `rgb(${c[0]},${c[1]},${c[2]})`;

/** Aparência do jogador: lida do busto dele (pele, cor e formato do cabelo); sem foto, sorteada pelo nome. */
export function lookOf(photo: string | undefined, name: string): Look {
  const id = photo?.match(/(\d+)\.jpg$/)?.[1];
  const known = id ? LOOKS[id] : undefined;
  if (known) return { skin: known[0], hair: known[1], style: known[2] };
  let h = 2166136261;
  for (let i = 0; i < name.length; i++) h = Math.imul(h ^ name.charCodeAt(i), 16777619);
  h >>>= 0;
  return { skin: [1, 2, 2, 3, 3, 4, 5, 6, 7][h % 9], hair: [0, 0, 0, 1, 1, 2, 3][(h >> 4) % 7], style: 2 };
}

const ROLE_HAIR = 2; // faixa do cabelo no atlas (papel 3)

/** Monta um quadro recolorido só com composição de canvas (sem ler pixels, que navegadores de privacidade falsificam). */
function frameCanvas(anim: Anim, frame: number, look: Look, kit: Kit): HTMLCanvasElement | null {
  const sh = sheets.get(anim);
  if (!sh || typeof sh === "string") return null;
  const key = `${anim}|${frame}|${look.skin}|${look.hair}|${look.style}|${kit.p}|${kit.s}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const sk = SKINS[Math.max(0, Math.min(7, look.skin))];
  const skin = hex(sk[0]);
  const skinShade = hex(sk[1]);
  const bald = look.hair >= 6 || look.style === 0;
  const hairCss = bald ? css(skin) : HAIRS[Math.min(5, look.hair)];
  const shirt = hex(kit.p);
  const shorts = hex(kit.s);
  const pal = [skin, skinShade, skin, shirt, shade(shirt, 0.78), shorts, [255, 255, 255], [17, 17, 17], [10, 10, 10]] as [number, number, number][];
  const cw = Math.round(sh.cell);
  const ch = Math.round(sh.h);
  const mk = (): [HTMLCanvasElement, CanvasRenderingContext2D] | null => {
    const c = document.createElement("canvas");
    c.width = cw;
    c.height = ch;
    const x = c.getContext("2d");
    return x ? [c, x] : null;
  };
  const o = mk();
  const t = mk();
  const hm = mk();
  const layer = mk();
  if (!o || !t || !hm || !layer) return null;
  const [out, g] = o;
  const [tmp, tc] = t;
  const f = Math.max(0, Math.min(FRAMES - 1, frame));
  const band = (ctx: CanvasRenderingContext2D, r: number): void => {
    ctx.globalCompositeOperation = "source-over";
    ctx.clearRect(0, 0, cw, ch);
    ctx.drawImage(sh.img, f * cw, r * ch, cw, ch, 0, 0, cw, ch);
  };
  // corpo (tudo menos o cabelo, que vai por cima)
  for (let r = 0; r < ROLE_COUNT; r++) {
    if (r === ROLE_HAIR) continue;
    band(tc, r);
    tc.globalCompositeOperation = "source-in";
    tc.fillStyle = css(pal[r]);
    tc.fillRect(0, 0, cw, ch);
    g.drawImage(tmp, 0, 0);
  }
  // cabelo: máscara na cor do cabelo e depois o formato
  const [hc, hx] = hm;
  band(hx, ROLE_HAIR);
  hx.globalCompositeOperation = "source-in";
  hx.fillStyle = hairCss;
  hx.fillRect(0, 0, cw, ch);
  const [lc, lx] = layer;
  const put = (dx: number, dy: number, alpha = 1): void => {
    lx.globalAlpha = alpha;
    lx.drawImage(hc, dx, dy);
    lx.globalAlpha = 1;
  };
  const box = META[anim]?.[f] ?? [0, 0, 0, 0];
  const cx = (box[0] + box[2]) / 2;
  switch (look.style) {
    case 1: // raspado: sombra de cabelo sobre a pele
      band(lx, ROLE_HAIR);
      lx.globalCompositeOperation = "source-in";
      lx.fillStyle = css(skin);
      lx.fillRect(0, 0, cw, ch);
      lx.globalCompositeOperation = "source-over";
      put(0, 0, bald ? 0 : 0.6);
      break;
    case 3: // médio/topete: um pouco mais alto
      put(0, 0);
      put(0, -1);
      break;
    case 4: // cheio/crespo: volume em volta da cabeça
      for (const [dx, dy] of [[0, 0], [-1, 0], [1, 0], [0, -1], [0, -2], [-1, -1], [1, -1], [-2, 0], [2, 0]]) put(dx, dy);
      break;
    case 5: // longo: desce pela nuca e ombros
      for (let d = 0; d <= 5; d++) put(0, d);
      break;
    case 6: { // trança/dreads: volume curto + fios caindo
      for (const [dx, dy] of [[0, 0], [-1, 0], [1, 0], [0, -1]]) put(dx, dy);
      const dc = document.createElement("canvas");
      dc.width = cw;
      dc.height = ch;
      const dx2 = dc.getContext("2d");
      if (dx2) {
        for (let d = 2; d <= 7; d++) dx2.drawImage(hc, 0, d);
        for (let x = 1; x < cw; x += 2) dx2.clearRect(x, 0, 1, ch);
        lx.drawImage(dc, 0, 0);
      }
      break;
    }
    case 7: // coque: bolinha no alto da cabeça
      put(0, 0);
      lx.fillStyle = hairCss;
      lx.fillRect(Math.round(cx) - 2, box[1] - 3, 4, 4);
      break;
    default: // 0 careca (já na cor da pele) e 2 curto
      put(0, 0);
  }
  g.drawImage(lc, 0, 0);
  cache.set(key, out);
  return out;
}

/** Quadro de uma animação pelo tempo: `t` em segundos desde o início, `fps` quadros por segundo; `loop` repete, senão trava no último. */
export function frameAt(t: number, fps: number, loop: boolean): number {
  const i = Math.floor(t * fps);
  return loop ? ((i % FRAMES) + FRAMES) % FRAMES : Math.min(FRAMES - 1, Math.max(0, i));
}

/**
 * Desenha o jogador em pixel art com o pé em (x, y) da tela. `s` = pixels por metro nessa profundidade (a mesma escala do desenho
 * vetorial); o boneco tem 1,95 m. Devolve a posição da cabeça, ou null se a faixa ainda não carregou (aí vale o desenho antigo).
 */
export function drawSprite(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, anim: Anim, frame: number, look: Look, kit: Kit, lift = 0): { x: number; y: number; s: number } | null {
  load(anim);
  const fc = frameCanvas(anim, frame, look, kit);
  if (!fc) return null;
  const h = 1.95 * s;
  const w = (fc.width / fc.height) * h;
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.fillStyle = "rgba(0,0,0,0.28)";
  ctx.beginPath();
  ctx.ellipse(x, y, 0.55 * s, 0.2 * s, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.drawImage(fc, x - w / 2, y - h - lift * s, w, h);
  ctx.restore();
  return { x, y: y - h - lift * s, s };
}
