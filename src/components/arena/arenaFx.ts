import { ARENA_CARD_BY_KEY } from "@/lib/arena/cards";
import type { GameEvent } from "@/lib/arena/core";
import { TEAM } from "./arenaRender";

// Animações da Arena. Tudo aqui é só visual: nada disso altera o jogo.
// Tempos em "ticks" (1/20 s); `tickF` = tick atual + fração entre ticks.

export type Anim = {
  born: number;
  /** distância andada (alimenta o balanço da caminhada) */
  walk: number;
  moving: boolean;
  face: 1 | -1;
  hit: number;
  atk: number;
  atkDx: number;
  atkDy: number;
  ranged: boolean;
};

export type Fx =
  | { k: "float"; x: number; y: number; text: string; color: string; t0: number; dur: number; big: boolean }
  | { k: "proj"; x1: number; y1: number; x2: number; y2: number; t0: number; dur: number; emoji: string | null; team: number }
  | { k: "slash"; x: number; y: number; ang: number; t0: number; dur: number }
  | { k: "burst"; x: number; y: number; t0: number; dur: number; color: string; r: number }
  | { k: "ring"; x: number; y: number; t0: number; dur: number; color: string; r: number }
  | { k: "spell"; key: string; x: number; y: number; r: number; t0: number; dur: number }
  | { k: "ghost"; x: number; y: number; card: string; flying: boolean; radius: number; side: number; t0: number; dur: number }
  | { k: "boom"; x: number; y: number; big: boolean; t0: number; dur: number };

export const newAnim = (born: number, side: number): Anim => ({
  born,
  walk: 0,
  moving: false,
  face: 1,
  hit: -99,
  atk: -99,
  atkDx: 0,
  atkDy: side === 0 ? -1 : 1,
  ranged: false,
});

const PROJ_EMOJI: Record<string, string | null> = {
  davi: "🪨",
  elias: "🔥",
  moises: "✨",
  salomao: "✨",
};

/** Transforma um evento do motor em animações. `anims` guarda o estado por entidade. */
export function applyEvent(ev: GameEvent, tick: number, anims: Map<number, Anim>, fx: Fx[], shake: { until: number; amp: number }) {
  switch (ev.t) {
    case "attack": {
      const a = anims.get(ev.from);
      const dx = ev.x2 - ev.x1;
      const dy = ev.y2 - ev.y1;
      const d = Math.sqrt(dx * dx + dy * dy) || 1;
      if (a) {
        a.atk = tick;
        a.atkDx = dx / d;
        a.atkDy = dy / d;
        a.ranged = ev.ranged;
        if (Math.abs(dx) > 0.2) a.face = dx > 0 ? 1 : -1;
      }
      if (ev.ranged) {
        const tower = ev.fromCard === "atalaia" || ev.fromCard === "santuario";
        fx.push({
          k: "proj", x1: ev.x1, y1: ev.y1 - (tower ? 1 : 0.3), x2: ev.x2, y2: ev.y2, t0: tick,
          dur: Math.max(3, Math.min(8, Math.round(d * 0.8))),
          emoji: tower ? null : (PROJ_EMOJI[ev.fromCard] ?? null), team: ev.side,
        });
      } else {
        fx.push({ k: "slash", x: ev.x2, y: ev.y2 - 0.2, ang: Math.atan2(dy, dx), t0: tick, dur: 6 });
      }
      break;
    }
    case "hit": {
      const a = anims.get(ev.id);
      if (a) a.hit = tick;
      if (ev.dmg > 0) {
        fx.push({
          k: "float", x: ev.x + (((ev.id * 7) % 5) - 2) * 0.12, y: ev.y - 1.3, text: String(Math.round(ev.dmg)),
          color: ev.side === 0 ? "#ff6b6b" : "#ffd43b", t0: tick, dur: 22, big: ev.dmg >= 100,
        });
        fx.push({ k: "burst", x: ev.x, y: ev.y - 0.4, t0: tick, dur: 5, color: ev.side === 0 ? "#ff8787" : "#fff3bf", r: 0.5 });
      }
      break;
    }
    case "heal":
      if (ev.amount > 0) {
        fx.push({ k: "float", x: ev.x, y: ev.y - 1.3, text: `+${ev.amount}`, color: "#69db7c", t0: tick, dur: 24, big: false });
        fx.push({ k: "ring", x: ev.x, y: ev.y + 0.2, t0: tick, dur: 12, color: "#69db7c", r: 0.9 });
      }
      break;
    case "spell":
      fx.push({ k: "spell", key: ev.key, x: ev.x, y: ev.y, r: ev.r, t0: tick, dur: ev.key === "fogo" ? 20 : 16 });
      if (ev.key === "fogo") {
        shake.until = tick + 10;
        shake.amp = 3;
      }
      break;
    case "spawn":
      fx.push({ k: "ring", x: ev.x, y: ev.y + 0.5, t0: tick, dur: 10, color: "rgba(255,255,255,0.9)", r: 1.1 });
      break;
    case "death":
      if (ev.tower) {
        fx.push({ k: "boom", x: ev.x, y: ev.y, big: true, t0: tick, dur: 26 });
        shake.until = tick + 14;
        shake.amp = 6;
      } else {
        fx.push({ k: "ghost", x: ev.x, y: ev.y, card: ev.card, flying: ev.flying, radius: ev.radius, side: ev.side, t0: tick, dur: 14 });
        fx.push({ k: "boom", x: ev.x, y: ev.y, big: false, t0: tick, dur: 10 });
      }
      anims.delete(ev.id);
      break;
  }
}

const ease = (p: number) => 1 - Math.pow(1 - p, 3);

type Sprites = Record<string, HTMLImageElement>;

function drawGhost(ctx: CanvasRenderingContext2D, s: number, f: Extract<Fx, { k: "ghost" }>, p: number, sprites: Sprites) {
  const img = sprites[f.card];
  const x = f.x * s;
  const footY = f.y * s + f.radius * s * 0.9 - (f.flying ? 0.9 * s : 0);
  ctx.save();
  ctx.globalAlpha = 1 - p;
  ctx.translate(x, footY - p * s * 0.6);
  ctx.rotate((f.side === 0 ? -1 : 1) * p * 0.5);
  const sc = 1 - p * 0.35;
  ctx.scale(sc, sc);
  if (img && img.complete && img.naturalWidth > 0) {
    const h = f.radius * 4.4 * s;
    const w = (h * img.naturalWidth) / img.naturalHeight;
    ctx.drawImage(img, -w / 2, -h * 0.97, w, h);
  } else {
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = `${Math.max(14, f.radius * 2.4 * s)}px system-ui, "Segoe UI Emoji", sans-serif`;
    ctx.fillStyle = "#000";
    ctx.fillText(ARENA_CARD_BY_KEY.get(f.card)?.emoji ?? "❔", 0, -f.radius * s * 0.9);
  }
  ctx.restore();
}

export function drawFx(ctx: CanvasRenderingContext2D, s: number, list: Fx[], tickF: number, sprites: Sprites) {
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  for (const f of list) {
    const p = (tickF - f.t0) / f.dur;
    if (p < 0 || p >= 1) continue;
    switch (f.k) {
      case "proj": {
        const x = (f.x1 + (f.x2 - f.x1) * p) * s;
        const arc = f.emoji ? Math.sin(p * Math.PI) * 0.9 : 0;
        const y = (f.y1 + (f.y2 - f.y1) * p - arc) * s;
        const ang = Math.atan2(f.y2 - f.y1, f.x2 - f.x1);
        if (f.emoji) {
          ctx.save();
          ctx.translate(x, y);
          ctx.rotate(p * 9);
          ctx.font = `${0.9 * s}px system-ui, "Segoe UI Emoji", sans-serif`;
          ctx.fillText(f.emoji, 0, 0);
          ctx.restore();
          // rastro
          ctx.fillStyle = "rgba(255,255,255,0.35)";
          ctx.beginPath();
          ctx.arc(x - Math.cos(ang) * s * 0.5, y - Math.sin(ang) * s * 0.5, s * 0.14, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.save();
          ctx.translate(x, y);
          ctx.rotate(ang);
          ctx.strokeStyle = "#f1f5f9";
          ctx.lineWidth = Math.max(2, s * 0.12);
          ctx.beginPath();
          ctx.moveTo(-s * 0.7, 0);
          ctx.lineTo(0, 0);
          ctx.stroke();
          ctx.fillStyle = TEAM[f.team === 0 ? 0 : 1];
          ctx.beginPath();
          ctx.moveTo(s * 0.3, 0);
          ctx.lineTo(0, -s * 0.2);
          ctx.lineTo(0, s * 0.2);
          ctx.closePath();
          ctx.fill();
          ctx.restore();
        }
        break;
      }
      case "slash": {
        ctx.save();
        ctx.translate(f.x * s, f.y * s);
        ctx.rotate(f.ang);
        ctx.strokeStyle = `rgba(255,248,200,${1 - p})`;
        ctx.lineWidth = Math.max(3, s * 0.26) * (1 - p * 0.6);
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.arc(-s * 0.2, 0, s * 0.95, -0.9 + p * 0.5, 0.9 + p * 0.5);
        ctx.stroke();
        ctx.restore();
        break;
      }
      case "burst": {
        const r = f.r * s * (0.5 + ease(p));
        ctx.fillStyle = f.color;
        ctx.globalAlpha = 1 - p;
        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * Math.PI * 2 + 0.4;
          ctx.beginPath();
          ctx.arc(f.x * s + Math.cos(a) * r, f.y * s + Math.sin(a) * r, s * 0.1 * (1 - p), 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.globalAlpha = 1;
        break;
      }
      case "ring": {
        ctx.strokeStyle = f.color;
        ctx.globalAlpha = 1 - p;
        ctx.lineWidth = Math.max(2, s * 0.14) * (1 - p * 0.5);
        ctx.beginPath();
        ctx.ellipse(f.x * s, f.y * s, f.r * s * ease(p), f.r * s * ease(p) * 0.45, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha = 1;
        break;
      }
      case "float": {
        const y = (f.y - ease(p) * 1.1) * s;
        const pop = p < 0.15 ? 0.6 + (p / 0.15) * 0.6 : 1.2 - Math.min(0.2, (p - 0.15) * 0.4);
        ctx.save();
        ctx.globalAlpha = p > 0.7 ? 1 - (p - 0.7) / 0.3 : 1;
        ctx.font = `900 ${(f.big ? 0.95 : 0.7) * s * pop}px system-ui, sans-serif`;
        ctx.lineWidth = Math.max(3, s * 0.18);
        ctx.strokeStyle = "rgba(0,0,0,0.9)";
        ctx.strokeText(f.text, f.x * s, y);
        ctx.fillStyle = f.color;
        ctx.fillText(f.text, f.x * s, y);
        ctx.restore();
        break;
      }
      case "ghost":
        drawGhost(ctx, s, f, p, sprites);
        break;
      case "boom": {
        const n = f.big ? 10 : 6;
        const R = (f.big ? 2.6 : 1.2) * s;
        ctx.globalAlpha = 1 - p;
        for (let i = 0; i < n; i++) {
          const a = (i / n) * Math.PI * 2;
          const d = ease(p) * R * (0.6 + (i % 3) * 0.25);
          ctx.fillStyle = i % 2 ? "#facc15" : "#fb923c";
          ctx.beginPath();
          ctx.arc(f.x * s + Math.cos(a) * d, f.y * s + Math.sin(a) * d * 0.8, s * (f.big ? 0.4 : 0.22) * (1 - p * 0.7), 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.fillStyle = "rgba(255,255,255,0.85)";
        ctx.beginPath();
        ctx.arc(f.x * s, f.y * s, R * 0.45 * (1 - p), 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
        break;
      }
      case "spell": {
        const x = f.x * s;
        const y = f.y * s;
        const R = f.r * s;
        if (f.key === "fogo") {
          // meteoro cai e explode
          const fall = Math.min(1, p / 0.35);
          if (fall < 1) {
            ctx.font = `${1.6 * s}px system-ui, "Segoe UI Emoji", sans-serif`;
            ctx.fillText("☄️", x + (1 - fall) * 3 * s, y - (1 - fall) * 8 * s);
          } else {
            const q = (p - 0.35) / 0.65;
            const g = ctx.createRadialGradient(x, y, 0, x, y, R * (0.5 + q));
            g.addColorStop(0, `rgba(255,240,180,${0.95 * (1 - q)})`);
            g.addColorStop(0.5, `rgba(255,140,40,${0.7 * (1 - q)})`);
            g.addColorStop(1, "rgba(255,60,0,0)");
            ctx.fillStyle = g;
            ctx.beginPath();
            ctx.arc(x, y, R * (0.5 + q), 0, Math.PI * 2);
            ctx.fill();
            ctx.globalAlpha = 1 - q;
            ctx.font = `${R * 1.2}px system-ui, "Segoe UI Emoji", sans-serif`;
            ctx.fillText("🔥", x, y);
            ctx.globalAlpha = 1;
          }
        } else if (f.key === "mar") {
          // ondas se espalhando
          for (let i = 0; i < 3; i++) {
            const q = Math.max(0, Math.min(1, p * 1.4 - i * 0.2));
            if (q <= 0) continue;
            ctx.strokeStyle = `rgba(120,200,255,${0.85 * (1 - q)})`;
            ctx.lineWidth = Math.max(3, s * 0.3) * (1 - q * 0.5);
            ctx.beginPath();
            ctx.ellipse(x, y, R * (0.3 + 0.8 * q), R * (0.3 + 0.8 * q) * 0.7, 0, 0, Math.PI * 2);
            ctx.stroke();
          }
          ctx.fillStyle = `rgba(80,160,230,${0.28 * (1 - p)})`;
          ctx.beginPath();
          ctx.ellipse(x, y, R, R * 0.7, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.globalAlpha = 1 - p;
          ctx.font = `${R * 0.9}px system-ui, "Segoe UI Emoji", sans-serif`;
          ctx.fillText("🌊", x, y);
          ctx.globalAlpha = 1;
        } else {
          // trombetas: ondas sonoras douradas
          for (let i = 0; i < 3; i++) {
            const q = Math.max(0, Math.min(1, p * 1.5 - i * 0.22));
            if (q <= 0) continue;
            ctx.strokeStyle = `rgba(250,204,21,${0.9 * (1 - q)})`;
            ctx.lineWidth = Math.max(2, s * 0.2) * (1 - q * 0.5);
            ctx.beginPath();
            ctx.arc(x, y, R * (0.25 + 0.9 * q), 0, Math.PI * 2);
            ctx.stroke();
          }
          ctx.globalAlpha = 1 - p;
          ctx.font = `${R * 0.9}px system-ui, "Segoe UI Emoji", sans-serif`;
          ctx.fillText("📯", x, y);
          ctx.globalAlpha = 1;
        }
        break;
      }
    }
  }
}
