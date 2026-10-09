// Ícones do shopping para o 3D (as mesmas imagens de public/shopping/icones usadas na tela): carregam uma vez e viram textura/desenho em canvas.
import * as THREE from "three";

export const ICON_BASE = "/shopping/icones";
const imgs = new Map<string, HTMLImageElement>();

export function preloadIcons(names: string[]): Promise<void> {
  return Promise.all(
    [...new Set(names)].map(
      (n) =>
        new Promise<void>((resolve) => {
          if (imgs.has(n)) return resolve();
          const im = new Image();
          im.onload = () => {
            imgs.set(n, im);
            resolve();
          };
          im.onerror = () => resolve();
          im.src = `${ICON_BASE}/${n}.webp`;
        }),
    ),
  ).then(() => undefined);
}
export const iconImg = (name: string): HTMLImageElement | undefined => imgs.get(name);

const texCache = new Map<string, THREE.CanvasTexture>();
/** Textura quadrada de um ícone (transparente). */
export function iconTexture(name: string): THREE.CanvasTexture {
  let t = texCache.get(name);
  if (!t) {
    const c = document.createElement("canvas");
    c.width = c.height = 128;
    const im = imgs.get(name);
    if (im) c.getContext("2d")!.drawImage(im, 0, 0, 128, 128);
    t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    texCache.set(name, t);
  }
  return t;
}
