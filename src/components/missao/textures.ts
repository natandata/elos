import * as THREE from "three";

// Texturas desenhadas em canvas (sem arquivos): fachadas de Madureira, chão, placas dos pontos marcantes.
// Sementes fixas: o bairro sai igual toda vez.

function rnd(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function tex(w: number, h: number, draw: (c: CanvasRenderingContext2D, r: () => number) => void, seed = 1, repeat = true): THREE.CanvasTexture {
  const cv = document.createElement("canvas");
  cv.width = w;
  cv.height = h;
  const c = cv.getContext("2d")!;
  draw(c, rnd(seed));
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  if (repeat) {
    t.wrapS = THREE.RepeatWrapping;
    t.wrapT = THREE.RepeatWrapping;
  }
  t.anisotropy = 4;
  return t;
}

function noise(c: CanvasRenderingContext2D, r: () => number, w: number, h: number, n: number, a: number, light = false) {
  for (let i = 0; i < n; i++) {
    const v = light ? 255 : 0;
    c.fillStyle = `rgba(${v},${v},${v},${r() * a})`;
    c.fillRect(r() * w, r() * h, 1 + r() * 2, 1 + r() * 2);
  }
}

/** Asfalto: cinza escuro com manchas. 1 repetição = 8 m. */
export const asphaltTex = () =>
  tex(512, 512, (c, r) => {
    c.fillStyle = "#4a4a4c";
    c.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 40; i++) {
      c.fillStyle = `rgba(${r() < 0.5 ? 30 : 90},${r() < 0.5 ? 30 : 90},${r() < 0.5 ? 32 : 92},${0.05 + r() * 0.08})`;
      c.beginPath();
      c.ellipse(r() * 512, r() * 512, 20 + r() * 80, 10 + r() * 40, r() * 3, 0, Math.PI * 2);
      c.fill();
    }
    noise(c, r, 512, 512, 9000, 0.35);
    noise(c, r, 512, 512, 5000, 0.18, true);
    // rachaduras finas
    c.strokeStyle = "rgba(20,20,20,0.35)";
    for (let i = 0; i < 6; i++) {
      c.beginPath();
      let x = r() * 512;
      let y = r() * 512;
      c.moveTo(x, y);
      for (let k = 0; k < 8; k++) {
        x += (r() - 0.5) * 40;
        y += (r() - 0.5) * 40;
        c.lineTo(x, y);
      }
      c.stroke();
    }
  }, 11);

/** Calçada de lajotas de concreto. 1 repetição = 4 m. */
export const sidewalkTex = () =>
  tex(512, 512, (c, r) => {
    c.fillStyle = "#c9c4ba";
    c.fillRect(0, 0, 512, 512);
    for (let y = 0; y < 8; y++)
      for (let x = 0; x < 8; x++) {
        const v = 196 + Math.floor((r() - 0.5) * 22);
        c.fillStyle = `rgb(${v},${v - 4},${v - 12})`;
        c.fillRect(x * 64 + 2, y * 64 + 2, 60, 60);
      }
    noise(c, r, 512, 512, 7000, 0.15);
    c.fillStyle = "rgba(90,85,80,0.25)";
    for (let i = 0; i < 25; i++) c.fillRect(r() * 512, r() * 512, 6 + r() * 20, 2 + r() * 6);
  }, 12);

/** Grama do parque. 1 repetição = 6 m. */
export const grassTex = () =>
  tex(256, 256, (c, r) => {
    c.fillStyle = "#5d8f3e";
    c.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 5000; i++) {
      const g = 110 + r() * 70;
      c.fillStyle = `rgba(${g * 0.55},${g},${g * 0.35},${0.5 + r() * 0.4})`;
      c.fillRect(r() * 256, r() * 256, 1, 2 + r() * 3);
    }
  }, 13);

/** Brita dos trilhos com dormentes. u ao longo do trilho (1 = 4 m), v = largura. */
export const ballastTex = () =>
  tex(256, 128, (c, r) => {
    c.fillStyle = "#6b625a";
    c.fillRect(0, 0, 256, 128);
    noise(c, r, 256, 128, 6000, 0.5);
    noise(c, r, 256, 128, 3000, 0.25, true);
    for (let i = 0; i < 8; i++) {
      c.fillStyle = "#4a3a2c";
      c.fillRect(i * 32 + 4, 14, 14, 100);
    }
    c.fillStyle = "#9aa0a6";
    c.fillRect(0, 36, 256, 6);
    c.fillRect(0, 86, 256, 6);
    c.fillStyle = "rgba(255,255,255,0.4)";
    c.fillRect(0, 37, 256, 2);
    c.fillRect(0, 87, 256, 2);
  }, 14);

/** Telhado de laje (concreto manchado). 1 repetição = 6 m. */
export const roofTex = () =>
  tex(256, 256, (c, r) => {
    c.fillStyle = "#9c9890";
    c.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 30; i++) {
      const v = r() < 0.5 ? 70 : 170;
      c.fillStyle = `rgba(${v},${v - 4},${v - 10},${0.08 + r() * 0.12})`;
      c.beginPath();
      c.ellipse(r() * 256, r() * 256, 10 + r() * 50, 6 + r() * 30, r() * 3, 0, Math.PI * 2);
      c.fill();
    }
    noise(c, r, 256, 256, 4000, 0.25);
  }, 15);

const SHOP_NAMES = ["MODAS", "CALÇADOS", "LANCHONETE", "FARMÁCIA", "ÓTICA", "BAZAR", "CELULARES", "AÇAÍ", "PADARIA", "CASA DO NORTE", "TECIDOS", "PAPELARIA", "BIJUTERIAS", "SALGADOS", "ARMARINHO", "UTILIDADES"];
const SIGN = ["#d62828", "#1d4ed8", "#f59e0b", "#16a34a", "#7c3aed", "#db2777", "#0891b2", "#ea580c"];

/**
 * Térreo comercial: 8 lojas de 4 m (32 m por repetição) x 4 m de altura.
 * Letreiro, porta de aço meio aberta e mercadoria na calçada, como no comércio popular de Madureira.
 */
export const shopTex = () =>
  tex(2048, 256, (c, r) => {
    c.fillStyle = "#e8e2d4";
    c.fillRect(0, 0, 2048, 256);
    for (let i = 0; i < 8; i++) {
      const x = i * 256;
      const col = SIGN[Math.floor(r() * SIGN.length)];
      // pilar
      c.fillStyle = "#d8d0c0";
      c.fillRect(x, 0, 14, 256);
      // letreiro
      c.fillStyle = col;
      c.fillRect(x + 14, 22, 242, 46);
      c.fillStyle = "rgba(255,255,255,0.12)";
      c.fillRect(x + 14, 22, 242, 10);
      c.fillStyle = "#fff";
      c.font = "bold 26px Arial, sans-serif";
      c.textAlign = "center";
      c.textBaseline = "middle";
      c.fillText(SHOP_NAMES[Math.floor(r() * SHOP_NAMES.length)], x + 135, 46);
      // vão da loja
      const open = r();
      c.fillStyle = "#2b2622";
      c.fillRect(x + 22, 74, 226, 182);
      // interior com mercadoria colorida
      for (let k = 0; k < 40; k++) {
        c.fillStyle = `hsl(${Math.floor(r() * 360)},${50 + r() * 40}%,${40 + r() * 30}%)`;
        c.fillRect(x + 26 + r() * 210, 120 + r() * 120, 6 + r() * 18, 8 + r() * 20);
      }
      // porta de aço de enrolar (fechada até onde está)
      const doorH = open < 0.25 ? 182 : open < 0.6 ? 40 + r() * 30 : 18;
      c.fillStyle = "#8f9498";
      c.fillRect(x + 22, 74, 226, doorH);
      c.strokeStyle = "rgba(40,40,40,0.35)";
      for (let y = 78; y < 74 + doorH; y += 6) {
        c.beginPath();
        c.moveTo(x + 22, y);
        c.lineTo(x + 248, y);
        c.stroke();
      }
      // pichação leve em porta fechada
      if (open < 0.25 && r() < 0.5) {
        c.strokeStyle = `rgba(${Math.floor(r() * 80)},${Math.floor(r() * 80)},${Math.floor(r() * 80)},0.6)`;
        c.lineWidth = 3;
        c.beginPath();
        c.moveTo(x + 60, 180);
        for (let k = 0; k < 6; k++) c.lineTo(x + 60 + k * 20, 160 + r() * 40);
        c.stroke();
        c.lineWidth = 1;
      }
    }
    // sujeira no rodapé
    const g = c.createLinearGradient(0, 200, 0, 256);
    g.addColorStop(0, "rgba(0,0,0,0)");
    g.addColorStop(1, "rgba(40,30,20,0.25)");
    c.fillStyle = g;
    c.fillRect(0, 200, 2048, 56);
  }, 21);

/** Térreo residencial: casas com portão, porta e janela com grade. 4 casas de 4 m (16 m) x 3,4 m. */
export const houseTex = () =>
  tex(1024, 256, (c, r) => {
    c.fillStyle = "#f2ede4";
    c.fillRect(0, 0, 1024, 256);
    for (let i = 0; i < 4; i++) {
      const x = i * 256;
      // muro com reboco
      c.fillStyle = "rgba(0,0,0,0.04)";
      c.fillRect(x, 0, 256, 256);
      // portão de ferro
      c.fillStyle = r() < 0.5 ? "#3c3f44" : "#6b2d1f";
      c.fillRect(x + 20, 96, 96, 160);
      c.strokeStyle = "rgba(255,255,255,0.15)";
      for (let k = 0; k < 10; k++) {
        c.beginPath();
        c.moveTo(x + 24 + k * 9, 100);
        c.lineTo(x + 24 + k * 9, 252);
        c.stroke();
      }
      // janela com grade
      c.fillStyle = "#3a4b57";
      c.fillRect(x + 150, 90, 80, 70);
      c.fillStyle = "rgba(170,200,220,0.35)";
      c.fillRect(x + 154, 94, 72, 30);
      c.strokeStyle = "#222";
      c.lineWidth = 3;
      for (let k = 0; k < 6; k++) {
        c.beginPath();
        c.moveTo(x + 150 + k * 16, 90);
        c.lineTo(x + 150 + k * 16, 160);
        c.stroke();
      }
      c.lineWidth = 1;
      c.fillStyle = "#cfc6b8";
      c.fillRect(x + 146, 160, 88, 8);
      // número e luz
      c.fillStyle = "#1e3a5f";
      c.fillRect(x + 128, 70, 18, 14);
    }
    noise(c, r, 1024, 256, 6000, 0.12);
    const g = c.createLinearGradient(0, 190, 0, 256);
    g.addColorStop(0, "rgba(0,0,0,0)");
    g.addColorStop(1, "rgba(60,45,30,0.3)");
    c.fillStyle = g;
    c.fillRect(0, 190, 1024, 66);
  }, 22);

/**
 * Andares de cima: 4 vãos de 3 m x 4 andares de 3 m (12 m x 12 m por repetição).
 * Janelas de alumínio, algumas com grade, ar-condicionado, varandinha, roupa no varal.
 */
export const upperTex = () =>
  tex(512, 512, (c, r) => {
    c.fillStyle = "#f4efe6";
    c.fillRect(0, 0, 512, 512);
    noise(c, r, 512, 512, 9000, 0.1);
    for (let fy = 0; fy < 4; fy++)
      for (let fx = 0; fx < 4; fx++) {
        const x = fx * 128;
        const y = fy * 128;
        const kind = r();
        // laje entre andares
        c.fillStyle = "rgba(0,0,0,0.07)";
        c.fillRect(x, y + 120, 128, 8);
        if (kind < 0.12) continue; // parede cega
        const wx = x + 26;
        const wy = y + 30;
        const ww = kind < 0.3 ? 76 : 60;
        const wh = 58;
        c.fillStyle = "#cfcac0";
        c.fillRect(wx - 5, wy - 5, ww + 10, wh + 12);
        c.fillStyle = r() < 0.5 ? "#2d3c47" : "#3b4a42";
        c.fillRect(wx, wy, ww, wh);
        c.fillStyle = "rgba(190,215,235,0.35)";
        c.fillRect(wx + 2, wy + 2, ww - 4, wh * 0.45);
        c.fillStyle = "#d9d9d9";
        c.fillRect(wx + ww / 2 - 1, wy, 2, wh);
        if (r() < 0.35) {
          c.strokeStyle = "#1c1c1c";
          c.lineWidth = 2;
          for (let k = 0; k <= 5; k++) {
            c.beginPath();
            c.moveTo(wx + (k * ww) / 5, wy);
            c.lineTo(wx + (k * ww) / 5, wy + wh);
            c.stroke();
          }
          c.lineWidth = 1;
        }
        if (r() < 0.3) {
          // ar-condicionado
          c.fillStyle = "#e6e6e6";
          c.fillRect(wx + ww + 6, wy + 30, 26, 20);
          c.strokeStyle = "#999";
          c.strokeRect(wx + ww + 6, wy + 30, 26, 20);
        }
        if (r() < 0.25) {
          // varandinha com grade
          c.fillStyle = "rgba(30,30,30,0.85)";
          c.fillRect(wx - 10, wy + wh + 2, ww + 20, 4);
          for (let k = 0; k < 10; k++) c.fillRect(wx - 10 + k * ((ww + 20) / 9), wy + wh - 20, 2, 24);
          if (r() < 0.5) {
            for (let k = 0; k < 4; k++) {
              c.fillStyle = `hsl(${Math.floor(r() * 360)},60%,60%)`;
              c.fillRect(wx + k * 14, wy + wh - 18, 10, 14);
            }
          }
        }
      }
    // manchas de chuva
    for (let i = 0; i < 18; i++) {
      const g = c.createLinearGradient(0, 0, 0, 120);
      g.addColorStop(0, "rgba(60,55,45,0.10)");
      g.addColorStop(1, "rgba(60,55,45,0)");
      c.fillStyle = g;
      c.fillRect(r() * 512, r() * 512, 6 + r() * 14, 80 + r() * 60);
    }
  }, 23);

/** Galpão: chapa metálica ondulada. 1 repetição = 4 m x 4 m. */
export const metalTex = () =>
  tex(256, 256, (c, r) => {
    c.fillStyle = "#a9adb0";
    c.fillRect(0, 0, 256, 256);
    for (let x = 0; x < 256; x += 8) {
      c.fillStyle = "rgba(0,0,0,0.12)";
      c.fillRect(x, 0, 3, 256);
      c.fillStyle = "rgba(255,255,255,0.12)";
      c.fillRect(x + 4, 0, 2, 256);
    }
    noise(c, r, 256, 256, 3000, 0.2);
    c.fillStyle = "rgba(140,80,40,0.15)";
    for (let i = 0; i < 12; i++) c.fillRect(r() * 256, r() * 256, 4 + r() * 10, 20 + r() * 50);
  }, 24);

/** Placa com texto (letreiros dos pontos marcantes). */
export function signTex(lines: { text: string; font: string; color: string; y: number }[], w: number, h: number, bg: (c: CanvasRenderingContext2D) => void): THREE.CanvasTexture {
  return tex(
    w,
    h,
    (c) => {
      bg(c);
      c.textAlign = "center";
      c.textBaseline = "middle";
      for (const l of lines) {
        c.font = l.font;
        c.fillStyle = l.color;
        c.fillText(l.text, w / 2, l.y);
      }
    },
    1,
    false,
  );
}

/** Céu: gradiente azul com nuvens (cúpula). */
export const skyTex = () =>
  tex(
    1024,
    512,
    (c, r) => {
      const g = c.createLinearGradient(0, 0, 0, 512);
      g.addColorStop(0, "#2f6fb8");
      g.addColorStop(0.45, "#7db3e4");
      g.addColorStop(0.62, "#cfe3f2");
      g.addColorStop(1, "#e9eef0");
      c.fillStyle = g;
      c.fillRect(0, 0, 1024, 512);
      for (let i = 0; i < 26; i++) {
        const x = r() * 1024;
        const y = 120 + r() * 170;
        for (let k = 0; k < 9; k++) {
          c.fillStyle = `rgba(255,255,255,${0.12 + r() * 0.2})`;
          c.beginPath();
          c.ellipse(x + (r() - 0.5) * 120, y + (r() - 0.5) * 18, 30 + r() * 60, 10 + r() * 16, 0, 0, Math.PI * 2);
          c.fill();
        }
      }
    },
    31,
    false,
  );
