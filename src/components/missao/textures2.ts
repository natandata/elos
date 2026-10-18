import { noise, tex } from "./textures";

// Texturas das melhorias feitas com as fotos do bairro (Mapillary, uso só como referência): muro da linha do trem
// pichado, calçadão vermelho do Parque, concreto gasto do viaduto, e o interior do templo.

/** Muro de concreto da linha do trem, com letras grandes pichadas. 8 m por repetição. */
export const graffitiWallTex = () =>
  tex(1024, 256, (c, r) => {
    c.fillStyle = "#a9a69d";
    c.fillRect(0, 0, 1024, 256);
    for (let i = 0; i < 24; i++) {
      c.fillStyle = `rgba(${r() < 0.5 ? 60 : 200},${r() < 0.5 ? 58 : 196},${r() < 0.5 ? 55 : 190},${0.05 + r() * 0.08})`;
      c.fillRect(r() * 1024, r() * 256, 40 + r() * 160, 20 + r() * 120);
    }
    noise(c, r, 1024, 256, 6000, 0.25);
    c.strokeStyle = "rgba(40,40,38,0.35)";
    c.lineWidth = 3;
    for (let x = 0; x <= 1024; x += 256) {
      c.beginPath();
      c.moveTo(x, 0);
      c.lineTo(x, 256);
      c.stroke();
    }
    // letras grandes (branco com contorno escuro) e tags coloridas
    const words = ["ARV", "KASSANDRA", "BRT", "MDR", "ZN", "LIRA", "SOUL"];
    c.textBaseline = "middle";
    c.textAlign = "left";
    const w1 = words[Math.floor(r() * words.length)];
    c.font = "900 150px Arial Black, Arial";
    c.lineWidth = 10;
    c.strokeStyle = "rgba(20,20,22,0.9)";
    c.strokeText(w1, 40 + r() * 80, 150);
    c.fillStyle = "#f2f2ee";
    c.fillText(w1, 40 + r() * 80, 150);
    for (let i = 0; i < 5; i++) {
      const col = ["#e11d48", "#2563eb", "#16a34a", "#f59e0b", "#7c3aed", "#111"][Math.floor(r() * 6)];
      c.fillStyle = col;
      c.font = `900 ${50 + Math.floor(r() * 40)}px Arial Black, Arial`;
      c.fillText(words[Math.floor(r() * words.length)], 520 + r() * 440, 60 + r() * 150);
    }
    const g = c.createLinearGradient(0, 180, 0, 256);
    g.addColorStop(0, "rgba(0,0,0,0)");
    g.addColorStop(1, "rgba(30,25,20,0.35)");
    c.fillStyle = g;
    c.fillRect(0, 180, 1024, 76);
  }, 51);

/** Grade (barras brancas) com fundo transparente, para o topo do muro. 8 m por repetição. */
export const fenceTex = (color = "#f4f4f0") =>
  tex(512, 128, (c) => {
    c.clearRect(0, 0, 512, 128);
    c.fillStyle = color;
    for (let x = 0; x < 512; x += 16) c.fillRect(x + 5, 6, 5, 116);
    c.fillRect(0, 6, 512, 8);
    c.fillRect(0, 110, 512, 8);
  }, 52);

/** Calçadão de concreto avermelhado do Parque. 4 m por repetição. */
export const pathTex = () =>
  tex(256, 256, (c, r) => {
    c.fillStyle = "#b46d63";
    c.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 18; i++) {
      c.fillStyle = `rgba(${r() < 0.5 ? 120 : 210},${r() < 0.5 ? 70 : 140},${r() < 0.5 ? 60 : 120},${0.06 + r() * 0.1})`;
      c.fillRect(r() * 256, r() * 256, 30 + r() * 80, 20 + r() * 60);
    }
    noise(c, r, 256, 256, 4000, 0.25);
    c.strokeStyle = "rgba(60,30,28,0.35)";
    c.lineWidth = 2;
    for (const y of [0, 128]) {
      c.beginPath();
      c.moveTo(0, y);
      c.lineTo(256, y);
      c.stroke();
    }
  }, 53);

/** Pilar do viaduto: concreto sujo com grafite colorido embaixo. */
export const pillarTex = () =>
  tex(256, 512, (c, r) => {
    c.fillStyle = "#9a968d";
    c.fillRect(0, 0, 256, 512);
    noise(c, r, 256, 512, 5000, 0.3);
    const g = c.createLinearGradient(0, 0, 0, 512);
    g.addColorStop(0, "rgba(40,36,30,0.0)");
    g.addColorStop(1, "rgba(40,36,30,0.4)");
    c.fillStyle = g;
    c.fillRect(0, 0, 256, 512);
    for (let i = 0; i < 9; i++) {
      c.fillStyle = `hsla(${Math.floor(r() * 360)},60%,${35 + r() * 20}%,0.75)`;
      c.beginPath();
      c.ellipse(r() * 256, 200 + r() * 300, 20 + r() * 50, 16 + r() * 40, r() * 3, 0, Math.PI * 2);
      c.fill();
    }
    c.strokeStyle = "rgba(15,15,15,0.7)";
    c.lineWidth = 5;
    for (let i = 0; i < 6; i++) {
      c.beginPath();
      c.moveTo(r() * 256, 220 + r() * 280);
      for (let k = 0; k < 4; k++) c.lineTo(r() * 256, 220 + r() * 280);
      c.stroke();
    }
  }, 54);

/** Placa de sinalização azul (ex.: "Madureira Shopping / Parque Madureira"). */
export const roadSignTex = (l1: string, l2: string) =>
  tex(
    512,
    160,
    (c) => {
      c.fillStyle = "#1d5fa8";
      c.fillRect(0, 0, 512, 160);
      c.strokeStyle = "#fff";
      c.lineWidth = 6;
      c.strokeRect(6, 6, 500, 148);
      c.fillStyle = "#fff";
      c.font = "bold 50px Arial";
      c.textAlign = "left";
      c.textBaseline = "middle";
      c.fillText(l1, 24, 52);
      c.fillText(l2, 24, 112);
      c.fillText("→", 440, 80);
    },
    1,
    false,
  );

// ------------------------------------------------------------- interior do templo

/** Parede de madeira (ripas verticais cor de mel) atrás do palco. 4 m por repetição. */
export const woodWallTex = () =>
  tex(256, 256, (c, r) => {
    for (let x = 0; x < 256; x += 16) {
      const v = 150 + Math.floor((r() - 0.5) * 36);
      c.fillStyle = `rgb(${v + 50},${v},${v - 70})`;
      c.fillRect(x, 0, 16, 256);
      c.fillStyle = "rgba(60,30,10,0.35)";
      c.fillRect(x, 0, 2, 256);
    }
    noise(c, r, 256, 256, 3000, 0.2);
  }, 55);

/** Carpete azul. 4 m por repetição. */
export const carpetTex = (base = "#23407e") =>
  tex(256, 256, (c, r) => {
    c.fillStyle = base;
    c.fillRect(0, 0, 256, 256);
    noise(c, r, 256, 256, 9000, 0.35);
    noise(c, r, 256, 256, 5000, 0.18, true);
  }, 56);

/** Parede interna branca com duas fileiras de janelas escuras. 6 m x 11 m por repetição. */
export const hallWallTex = () =>
  tex(512, 1024, (c, r) => {
    c.fillStyle = "#f3f0e8";
    c.fillRect(0, 0, 512, 1024);
    noise(c, r, 512, 1024, 4000, 0.08);
    for (const y of [60, 330]) {
      for (let x = 0; x < 512; x += 256) {
        c.fillStyle = "#e8e4da";
        c.fillRect(x + 20, y - 6, 216, 232);
        c.fillStyle = "#232b32";
        c.fillRect(x + 28, y, 200, 220);
        c.fillStyle = "rgba(150,180,200,0.18)";
        c.fillRect(x + 28, y, 200, 70);
        c.fillStyle = "#e8e4da";
        c.fillRect(x + 126, y, 4, 220);
        c.fillRect(x + 28, y + 108, 200, 4);
      }
    }
    // faixa do rodapé
    c.fillStyle = "#5a7fb0";
    c.fillRect(0, 960, 512, 64);
  }, 57);

/** Forro de placas brancas. 4 m por repetição. */
export const ceilingTex = () =>
  tex(256, 256, (c, r) => {
    c.fillStyle = "#ede9e0";
    c.fillRect(0, 0, 256, 256);
    noise(c, r, 256, 256, 2500, 0.12);
    c.strokeStyle = "rgba(90,86,78,0.45)";
    c.lineWidth = 2;
    for (let i = 0; i <= 256; i += 64) {
      c.beginPath();
      c.moveTo(i, 0);
      c.lineTo(i, 256);
      c.stroke();
      c.beginPath();
      c.moveTo(0, i);
      c.lineTo(256, i);
      c.stroke();
    }
  }, 58);

/** Telão da igreja (projeção). */
export const screenTex = () =>
  tex(
    512,
    288,
    (c) => {
      const g = c.createLinearGradient(0, 0, 512, 288);
      g.addColorStop(0, "#5b2a86");
      g.addColorStop(0.55, "#c2185b");
      g.addColorStop(1, "#f59e0b");
      c.fillStyle = g;
      c.fillRect(0, 0, 512, 288);
      c.fillStyle = "#fff";
      c.textAlign = "center";
      c.textBaseline = "middle";
      c.font = "bold 44px Georgia, serif";
      c.fillText("Ide e fazei discípulos", 256, 120);
      c.font = "28px Georgia, serif";
      c.fillText("Mateus 28:19", 256, 180);
    },
    1,
    false,
  );
