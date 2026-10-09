// Sprites do campo da Arena (public/arena/campo): torres, ruínas, ponte e adereços do cenário.
// Carregam uma vez; quem desenha pede por nome e recebe `null` enquanto a imagem não chegou.

export const CAMPO = [
  "torre-azul", "torre-vermelha", "ruina-torre", "rei-azul", "rei-vermelho", "ruina-rei", "ponte",
  "arvore", "pinheiro", "macieira", "arbusto", "arbusto-flores", "pedras", "rochedo", "toco", "flores", "capim",
  "cerca", "cerca-canto", "feno", "tocha", "cogumelos", "toras", "vitoria-regia", "taboa", "seixos", "placa",
  "palmeira", "oliveira", "arvore-moedas", "carvalho", "arvore-seca", "pinheiro-neve", "arbusto-bagas",
  "selva-arvore", "selva-folhas", "selva-totem", "selva-tronco", "paris-torre", "paris-mesa", "paris-poste", "paris-jardineira", "quartel-barraca", "quartel-sacos", "quartel-bandeira", "quartel-jipe", "rock-caixas", "rock-bateria", "rock-trelica", "rock-guitarra", "aula-carteira", "aula-lousa", "aula-globo", "aula-livros", "igreja-banco", "igreja-vitral", "igreja-candelabro", "igreja-cruz", "casamento-arco", "casamento-bolo", "casamento-cadeira", "casamento-baloes", "gabinete-estante", "gabinete-mesa", "gabinete-poltrona", "gabinete-abajur",
  "cobra", "adao", "eva", "leao", "cordeiro", "cervo",
] as const;
export type CampoName = (typeof CAMPO)[number];

const cache = new Map<string, HTMLImageElement>();
let loading: Promise<void> | null = null;

/** O sprite, se já carregou. */
export function campo(name: CampoName): HTMLImageElement | null {
  const im = cache.get(name);
  return im && im.complete && im.naturalWidth > 0 ? im : null;
}

/** Baixa todos os sprites do campo (uma vez só). Resolve quando acabou, mesmo se algum falhar. */
export function loadCampo(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  loading ??= Promise.all(
    CAMPO.map(
      (n) =>
        new Promise<void>((res) => {
          const im = new Image();
          im.onload = () => res();
          im.onerror = () => res();
          im.src = `/arena/campo/${n}.webp`;
          cache.set(n, im);
        }),
    ),
  ).then(() => undefined);
  return loading;
}

const tintCache = new Map<string, HTMLCanvasElement>();

/** Cópia do sprite com uma cor misturada por cima (só nos pixels desenhados), para combinar com o tema da arena. */
export function tinted(name: CampoName, color: string, amount: number): CanvasImageSource | null {
  const im = campo(name);
  if (!im) return null;
  if (amount <= 0) return im;
  const key = `${name}|${color}|${amount}`;
  let c = tintCache.get(key);
  if (!c) {
    c = document.createElement("canvas");
    c.width = im.naturalWidth;
    c.height = im.naturalHeight;
    const g = c.getContext("2d")!;
    g.drawImage(im, 0, 0);
    g.globalCompositeOperation = "source-atop";
    g.globalAlpha = amount;
    g.fillStyle = color;
    g.fillRect(0, 0, c.width, c.height);
    tintCache.set(key, c);
  }
  return c;
}

/** "#rrggbb" escurecido (k < 1) ou clareado (k > 1). Cores em outro formato voltam como vieram. */
export function shade(hex: string, k: number): string {
  const m = /^#([0-9a-f]{6})$/i.exec(hex);
  if (!m) return hex;
  const n = parseInt(m[1], 16);
  const ch = (v: number) => Math.max(0, Math.min(255, Math.round(v * k)));
  return `rgb(${ch((n >> 16) & 255)},${ch((n >> 8) & 255)},${ch(n & 255)})`;
}
