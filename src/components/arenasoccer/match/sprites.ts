// ArenaSoccer · jogadores em pixel art. As faixas de animação (public/arenasoccer/sprites/*.png) guardam um "papel" por pixel
// (pele, cabelo, camisa...) no canal vermelho; aqui o papel vira cor conforme o jogador (pele e cabelo do busto, camisa do time).
import looksData from "@/lib/arenasoccer/data/looks.json";
import type { Kit } from "@/lib/arenasoccer/teams";

export type Anim = "run" | "kick" | "header" | "celebrate";
export type Look = { skin: number; hair: number; style: number };
const LOOKS = looksData as unknown as Record<string, [number, number, number]>;

const FRAMES = 6;
const SKINS: [string, string][] = [
  ["#f6d2b5", "#d9a883"],
  ["#eebb94", "#c98f68"],
  ["#d99a6c", "#b5764a"],
  ["#b9794b", "#8f5630"],
  ["#8d5a34", "#693c1f"],
  ["#5e3a22", "#3f2514"],
];
// preto, castanho, loiro, ruivo, grisalho, careca (cor da pele)
const HAIRS = ["#1b1b1b", "#4a3020", "#d9b45a", "#b5502a", "#bdbdbd", ""];

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

/** Cara do jogador a partir da foto do busto; quem não tem foto recebe uma cara sorteada pelo nome. */
export function lookOf(photo: string | undefined, name: string): Look {
  const id = photo?.match(/(\d+)\.jpg$/)?.[1];
  const known = id ? LOOKS[id] : undefined;
  if (known) return { skin: known[0], hair: known[1], style: known[2] };
  let h = 2166136261;
  for (let i = 0; i < name.length; i++) h = Math.imul(h ^ name.charCodeAt(i), 16777619);
  h >>>= 0;
  return { skin: [1, 1, 2, 2, 3, 4, 5][h % 7], hair: [0, 0, 0, 1, 1, 2][(h >> 4) % 6], style: 1 };
}

const css = (c: [number, number, number]): string => `rgb(${c[0]},${c[1]},${c[2]})`;

/** Monta um quadro recolorido só com composição de canvas (sem ler pixels, que navegadores de privacidade falsificam). */
function frameCanvas(anim: Anim, frame: number, look: Look, kit: Kit): HTMLCanvasElement | null {
  const sh = sheets.get(anim);
  if (!sh || typeof sh === "string") return null;
  const key = `${anim}|${frame}|${look.skin}|${look.hair}|${kit.p}|${kit.s}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const skin = hex(SKINS[Math.min(5, look.skin)][0]);
  const skinShade = hex(SKINS[Math.min(5, look.skin)][1]);
  const hair = look.hair === 5 ? skin : hex(HAIRS[look.hair]);
  const shirt = hex(kit.p);
  const shorts = hex(kit.s);
  const pal = [skin, skinShade, hair, shirt, shade(shirt, 0.78), shorts, [255, 255, 255], [17, 17, 17], [10, 10, 10]] as [number, number, number][];
  const cw = Math.round(sh.cell);
  const ch = Math.round(sh.h);
  const out = document.createElement("canvas");
  out.width = cw;
  out.height = ch;
  const g = out.getContext("2d");
  const tmp = document.createElement("canvas");
  tmp.width = cw;
  tmp.height = ch;
  const t = tmp.getContext("2d");
  if (!g || !t) return null;
  const f = Math.max(0, Math.min(FRAMES - 1, frame));
  for (let r = 0; r < ROLE_COUNT; r++) {
    t.globalCompositeOperation = "source-over";
    t.clearRect(0, 0, cw, ch);
    t.drawImage(sh.img, f * cw, r * ch, cw, ch, 0, 0, cw, ch);
    t.globalCompositeOperation = "source-in";
    t.fillStyle = css(pal[r]);
    t.fillRect(0, 0, cw, ch);
    g.drawImage(tmp, 0, 0);
  }
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
