"use client";

import { useEffect, useRef } from "react";
import { bestFormation, pickLineup, toPlayer, type Player } from "@/lib/arenasoccer/sim";
import { Sfx } from "@/lib/arenasoccer/sound";
import type { Kit, RosterPlayer, Team } from "@/lib/arenasoccer/teams";
import { Cam, drawBackdrop, drawBanner, drawLabels, drawPlayer, drawStadium, type LabelItem, type Sprite } from "./pitch3d";
import { drawTrophySprite, frameAt, framesOf, lookOf, preloadSprites, type Anim, type Look } from "./sprites";

export type CutsceneKind = "intro" | "trophy";
type Actor = { id: string; kit: Kit; look: Look; name: string };

/** Os 11 titulares de um time (para as cutscenes usarem os jogadores de verdade). */
export function xiOf(team: Team): Player[] {
  const sq = team.players.map((p) => toPlayer(p as RosterPlayer));
  return pickLineup(sq, bestFormation(sq)).xi;
}

const REF_KIT: Kit = { p: "#16161a", s: "#16161a", k: "solid" };
const lerp = (a: number, b: number, t: number): number => a + (b - a) * Math.max(0, Math.min(1, t));
const ease = (t: number): number => {
  const k = Math.max(0, Math.min(1, t));
  return k * k * (3 - 2 * k);
};
const seg = (t: number, a: number, b: number): number => Math.max(0, Math.min(1, (t - a) / (b - a)));
const FORM: [number, number][] = [[0, -3], [-8, -9], [-3, -9], [3, -9], [8, -9], [-9, -17], [-3, -16], [3, -16], [9, -17], [-3, -24], [3, -24]];
const pseudo = (i: number, k: number): number => {
  const x = Math.sin(i * 12.9898 + k * 78.233) * 43758.5453;
  return x - Math.floor(x);
};

function squad(xi: Player[] | undefined, kit: Kit, tag: string): Actor[] {
  return Array.from({ length: 11 }, (_, i) => {
    const p = xi?.[i];
    const name = p?.name ?? `${tag}${i}`;
    return { id: `${tag}${i}`, kit, look: lookOf(p?.photo, name), name };
  });
}

type Cam3 = { x: number; y: number; fx: number; fy: number; back: number; zoom: number; tilt?: number; height?: number };

/**
 * Cutscene de final de campeonato em canvas, com os jogadores em pixel art (de frente e de costas) e vários planos de câmera.
 * `intro`: estádio e fogos, os times entram andando, hino com a mão no peito, o juiz e o apito.
 * `trophy`: apito final, corrida e deslize de joelhos até a torcida, choro e gritos, a taça erguida por todos e a volta olímpica.
 */
export function Cutscene({ kind, title, mineName, oppName, kits, mineXI, oppXI, startAt = 0, onEnd }: { kind: CutsceneKind; title: string; mineName: string; oppName: string; kits: [Kit, Kit]; mineXI?: Player[]; oppXI?: Player[]; /** começa já neste segundo (só para teste) */ startAt?: number; onEnd: () => void }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const endRef = useRef(onEnd);
  useEffect(() => {
    endRef.current = onEnd;
  }, [onEnd]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !wrap || !ctx) return;
    preloadSprites();
    const sfx = new Sfx();
    const total = kind === "intro" ? 27 : 34;
    const A = squad(mineXI, kits[0], "a");
    const B = squad(oppXI, kits[1], "b");
    const REF: Actor = { id: "ref", kit: REF_KIT, look: lookOf(undefined, "juiz"), name: "juiz" };
    const lo = document.createElement("canvas");
    const loCtx = lo.getContext("2d");
    const PX = 3;
    let W = 360;
    let H = 640;
    let cs: Cam3 = { x: 0, y: -48, fx: 0, fy: -20, back: 6, zoom: 1 };
    let cam = new Cam(W, H, [cs.x, cs.y], [cs.fx, cs.fy], { back: cs.back, zoom: cs.zoom });
    let loCam = cam;
    const applyCam = (): void => {
      const o = { back: cs.back, zoom: cs.zoom, tilt: cs.tilt, height: cs.height };
      cam = new Cam(W, H, [cs.x, cs.y], [cs.fx, cs.fy], o);
      lo.width = Math.ceil(W / PX);
      lo.height = Math.ceil(H / PX);
      loCam = new Cam(lo.width, lo.height, [cs.x, cs.y], [cs.fx, cs.fy], o);
    };
    const resize = (): void => {
      const r = wrap.getBoundingClientRect();
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      W = Math.max(240, Math.round(r.width));
      H = Math.max(360, Math.round(r.height));
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
      canvas.style.width = `${W}px`;
      canvas.style.height = `${H}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      applyCam();
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(wrap);

    const started = performance.now() - startAt * 1000;
    let alive = true;
    let ended = false;
    const fired = new Set<string>();
    const once = (k: string, fn: () => void): void => {
      if (fired.has(k)) return;
      fired.add(k);
      try {
        fn();
      } catch {
        /* som é opcional */
      }
    };
    const finish = (): void => {
      if (ended) return;
      ended = true;
      alive = false;
      endRef.current();
    };
    (canvas as HTMLCanvasElement & { __skip?: () => void }).__skip = finish;

    const sprites: Sprite[] = [];
    const labels: { x: number; y: number; name: string }[] = [];
    const bubbles: { x: number; y: number; z: number; txt: string }[] = [];
    let banner: [string, string, string | null] | null = null;
    let flash = 0;
    const state: { trophy: { x: number; y: number; h: number } | null } = { trophy: null };
    let flags = 0;
    let confettiOn = 0;
    const put = (a: Actor, x: number, y: number, anim: Anim, frame: number, extra: Partial<Sprite> = {}): void => {
      sprites.push({ x, y, kit: a.kit, name: a.id, pix: { anim, frame: Math.max(0, Math.min(framesOf(anim) - 1, frame)), look: a.look }, ...extra });
    };

    // linhas de hino: A à esquerda, B à direita, de frente para a câmera
    const lineX = (sd: -1 | 1, i: number): number => sd * (1.4 + i * 0.95);
    const LINE_Y = -30;

    const introScene = (t: number): void => {
      // 0-4: estádio e fogos; 4-12: entrada; 12-21: hino; 21-27: juiz, apito e posições
      if (t < 4.2) {
        cs = { x: lerp(-6, 6, t / 4.2), y: -52, fx: 0, fy: -6, back: 4, zoom: 0.78 };
        flags = 1;
        banner = t > 0.4 && t < 3.9 ? [title.toUpperCase(), "#fde047", `${mineName} x ${oppName}`] : null;
        once("cheer0", () => sfx.cheer(7, 0.07));
        return;
      }
      if (t < 12.2) {
        // os dois times entram andando, de frente para a câmera
        const w = t - 4.2;
        cs = { x: 0, y: -35, fx: 0, fy: -12, back: 4, zoom: lerp(1.0, 1.25, seg(t, 4.2, 12)), tilt: 32, height: 9 };
        flags = 1;
        banner = t < 6 ? ["OS TIMES ENTRAM EM CAMPO", "#fff", null] : null;
        const refY = lerp(-6, -26, ease(seg(w, 0, 6.5)));
        put(REF, 0, refY, "f-walk", frameAt(w * 1.1, 8, true));
        for (const [team, sd] of [[A, -1], [B, 1]] as [Actor[], -1 | 1][]) {
          team.forEach((a, i) => {
            const d = seg(w, 0.4 + i * 0.28, 5.6 + i * 0.28);
            const colX = sd * 3.2;
            const x = lerp(colX, lineX(sd, i), ease(seg(d, 0.55, 1)));
            const y = lerp(-3, LINE_Y, ease(d));
            put(a, x, y, "f-walk", d > 0 && d < 1 ? frameAt(w + i * 0.15, 8, true) : 0);
          });
        }
        return;
      }
      if (t < 21.5) {
        // hino: mão no peito; três planos (geral, time da casa, time visitante)
        const h = t - 12.2;
        flags = 1;
        const wide = h < 3.2;
        const pan = h < 3.2 ? 0 : h < 6.2 ? seg(h, 3.2, 6.2) : seg(h, 6.2, 9.3);
        if (wide) cs = { x: 0, y: -44, fx: 0, fy: -26, back: 5, zoom: 0.75, tilt: 40, height: 16 };
        else if (h < 6.2) cs = { x: lerp(-9.5, -3, ease(pan)), y: -35, fx: lerp(-9.5, -3, ease(pan)), fy: -26, back: 4, zoom: 1.2, tilt: 32, height: 9 };
        else cs = { x: lerp(3, 9.5, ease(pan)), y: -35, fx: lerp(3, 9.5, ease(pan)), fy: -26, back: 4, zoom: 1.2, tilt: 32, height: 9 };
        banner = h < 2.6 ? ["HINO NACIONAL", "#fff", null] : null;
        put(REF, 0, -26, "f-ref", 0);
        for (const [team, sd] of [[A, -1], [B, 1]] as [Actor[], -1 | 1][]) {
          team.forEach((a, i) => {
            put(a, lineX(sd, i), LINE_Y, "f-anthem", frameAt(h * 1.9 + i * 0.37, 2.4, true));
            if (!wide) labels.push({ x: lineX(sd, i), y: LINE_Y, name: a.name });
          });
        }
        if (h > 0.6) for (let i = 0; i < 8; i++) bubbles.push({ x: lerp(-10, 10, i / 7) + Math.sin(h * 2 + i) * 1.3, y: -31, z: 3 + ((h * 1.4 + i * 0.7) % 3), txt: i % 2 ? "♪" : "♫" });
        once("cheer1", () => sfx.cheer(9, 0.06));
        return;
      }
      // juiz com o apito, depois os times correm para as posições (de costas)
      const r = t - 21.5;
      flags = 0;
      cs = { x: 0, y: -36, fx: 0, fy: lerp(-24, -18, ease(seg(r, 0, 5.5))), back: 4, zoom: lerp(1.3, 0.95, ease(seg(r, 2.2, 5.5))), tilt: 32, height: 9 };
      const run = ease(seg(r, 1.4, 3.8));
      const form = (sd: -1 | 1, i: number): [number, number] => [sd * 6.2 + FORM[i][0] * 0.5, -23 + FORM[i][1] * 0.4];
      for (const [team, sd] of [[A, -1], [B, 1]] as [Actor[], -1 | 1][]) {
        team.forEach((a, i) => {
          const [fx, fy] = form(sd, i);
          const x = lerp(lineX(sd, i), fx, run);
          const y = lerp(LINE_Y, fy, run);
          if (run <= 0) put(a, x, y, "f-anthem", 0);
          else put(a, x, y, "run", run < 1 ? frameAt(r + i * 0.12, 9, true) : 0);
        });
      }
      const refFrame = r < 0.7 ? 0 : r < 1.3 ? 1 : r < 2.6 ? 2 : r < 3.3 ? 3 : 5;
      put(REF, 0, -26, "f-ref", refFrame);
      banner = r > 1.4 && r < 2.8 ? ["APITO INICIAL!", "#fde047", null] : null;
      if (r > 1.4) once("whistle", () => sfx.whistle());
      if (r > 1.4 && r < 1.55) flash = 0.7;
    };

    const trophyScene = (t: number): void => {
      // 0-3 apito final; 3-10 corrida e deslize; 10-17 choro e gritos; 17-24 a taça; 24-34 volta à torcida
      confettiOn = t > 3.5 ? Math.min(1, (t - 3.5) / 2) : 0;
      if (t < 3.2) {
        cs = { x: 0, y: -44, fx: 0, fy: -26, back: 5, zoom: lerp(1.0, 1.2, seg(t, 0, 3)) };
        put(REF, 0, -30, "f-ref", t < 0.4 ? 1 : t < 1.1 ? 2 : t < 2 ? 3 : 4);
        A.forEach((a, i) => put(a, FORM[i][0] * 0.9, -22 + FORM[i][1] * 0.5, "f-lift", t > 1.1 ? 2 : 0));
        B.forEach((a, i) => put(a, FORM[i][0] * 0.4 + 12 * (i % 2 ? 1 : -1), -20 - (i % 3) * 2, "f-cry", 1));
        banner = ["FIM DE JOGO!", "#fde047", null];
        once("end", () => sfx.whistle());
        if (t > 1.2) once("cheer", () => sfx.cheer(10, 0.09));
        return;
      }
      if (t < 10.5) {
        // todos correm para a câmera (a torcida); alguns deslizam de joelhos
        const r = t - 3.2;
        cs = { x: 0, y: -48 + seg(r, 0, 7) * 6, fx: 0, fy: -26, back: 5, zoom: lerp(0.95, 1.15, seg(r, 0, 7)) };
        A.forEach((a, i) => {
          const d = seg(r, i * 0.16, 4.6 + i * 0.16);
          const sx = FORM[i][0] * 0.9;
          const tx = (i - 5) * 1.5 + (pseudo(i, 1) - 0.5) * 2;
          const x = lerp(sx, tx, ease(d));
          const y = lerp(-22 + FORM[i][1] * 0.5, -37 - (i % 3) * 1.2, ease(d));
          const slide = i % 3 === 0 && d >= 1;
          if (slide) put(a, x, y, "f-slide", Math.min(3, Math.floor((r - (4.6 + i * 0.16)) * 3)), { lift: 0 });
          else put(a, x, y, "f-run", d < 1 ? frameAt(r * 1.2 + i * 0.2, 9, true) : frameAt(r + i * 0.3, 6, true));
        });
        B.slice(0, 7).forEach((a, i) => put(a, (i % 2 ? 1 : -1) * (7 + (i >> 1) * 3.2), -18 - (i % 3) * 2, i % 2 ? "f-slide" : "f-cry", i % 2 ? 6 : 0));
        banner = r < 2.2 ? ["É CAMPEÃO!", "#fff", null] : null;
        return;
      }
      if (t < 17.5) {
        // choro, gritos, abraços (plano fechado)
        const c = t - 10.5;
        cs = { x: lerp(-2, 2, c / 7), y: -44, fx: lerp(-2, 2, c / 7), fy: -30, back: 5, zoom: lerp(1.2, 1.55, seg(c, 0, 7)) };
        A.forEach((a, i) => {
          const x = (i - 5) * 1.35 + (pseudo(i, 2) - 0.5) * 1.2;
          const y = -33 - (i % 3) * 1.1;
          const mode = (i + Math.floor(c / 2.2)) % 4;
          if (mode === 0) put(a, x, y, "f-cry", frameAt(c * 1.6 + i * 0.4, 2.6, true));
          else if (mode === 1) put(a, x, y, "f-run", frameAt(c * 1.6 + i * 0.3, 7, true), { lift: Math.abs(Math.sin(c * 5 + i)) * 0.18 });
          else if (mode === 2) put(a, x, y, "f-slide", 2 + (Math.floor(c * 1.4 + i) % 3));
          else put(a, x, y, "f-cry", 2 + (Math.floor(c * 1.8 + i) % 4));
          if ((i + Math.floor(c * 2)) % 5 === 0) bubbles.push({ x, y, z: 2.5, txt: "🙌" });
        });
        banner = c < 2 ? ["EMOÇÃO!", "#fde047", null] : null;
        once("goal", () => sfx.goal());
        if (c > 2) once("cheer2", () => sfx.cheer(8, 0.09));
        return;
      }
      if (t < 24.5) {
        // todos juntos: braços para o alto e a taça sobe
        const u = t - 17.5;
        cs = { x: 0, y: -41, fx: 0, fy: -31, back: 4, zoom: lerp(1.0, 1.35, ease(seg(u, 0, 7))), tilt: 30, height: 8 };
        const raise = ease(seg(u, 0.4, 2.2));
        A.forEach((a, i) => {
          const row = i < 6 ? 0 : 1;
          const k = row === 0 ? i - 2.5 : i - 8;
          const x = k * 1.5;
          const y = -33 - row * 1.3;
          put(a, x, y, "f-lift", Math.round(raise * 4) + (u > 2.6 ? 1 + (Math.floor(u * 3 + i) % 2) : 0), { lift: u > 2.6 ? Math.abs(Math.sin(u * 4 + i)) * 0.12 : 0 });
        });
        const rise = ease(seg(u, 1.4, 3));
        state.trophy = { x: 0, y: -33.5, h: lerp(0.4, 6, rise) };
        banner = u > 3.4 ? [`${mineName.toUpperCase()}`, "#fde047", `${title}`] : null;
        once("cheer3", () => sfx.cheer(9, 0.1));
        return;
      }
      // volta olímpica: caminham em direção à torcida com a taça
      const v = t - 24.5;
      cs = { x: 0, y: lerp(-44, -50, ease(seg(v, 0, 9.5))), fx: 0, fy: -26, back: 5, zoom: lerp(1.35, 0.85, ease(seg(v, 0, 9.5))) };
      const toFans = ease(seg(v, 0.5, 9));
      A.forEach((a, i) => {
        const x = (i - 5) * 1.5 * lerp(1, 1.6, toFans) + (pseudo(i, 3) - 0.5);
        const y = lerp(-34, -41, toFans) - (i % 3) * 0.9;
        put(a, x, y, "f-walk", v < 9.5 ? frameAt(v * 1.1 + i * 0.15, 8, true) : 0, { lift: 0 });
      });
      // o capitão (11º) leva a taça
      const cap = A[10];
      const cx = lerp(0, 0, 1);
      const cy = lerp(-34, -41, toFans);
      put(cap, cx, cy, "f-lift", 3 + (Math.floor(v * 3) % 2));
      state.trophy = { x: cx, y: cy, h: 5.5 };
      confettiOn = 1;
      banner = v < 4 ? [`${mineName.toUpperCase()} CAMPEÃO!`, "#fde047", title] : null;
    };

    // confete, fogos e bandeiras
    const confetti = Array.from({ length: 140 }, (_, i) => ({ x: pseudo(i, 4), v: 0.25 + pseudo(i, 5) * 0.6, ph: pseudo(i, 6) * 6, c: ["#fde047", "#f87171", "#60a5fa", "#4ade80", "#fff", "#f472b6"][i % 6], s: 3 + pseudo(i, 7) * 4 }));
    const drawFlags = (t: number): void => {
      const hy = Math.max(0, Math.min(H, cam.horizonY()));
      const n = Math.ceil(W / 42);
      for (let i = 0; i < n; i++) {
        const x = (i + 0.5) * (W / n) + Math.sin(i * 3.1) * 8;
        const y = hy - 4 - ((i * 37) % 22);
        const col = i % 3 === 0 ? kits[0].p : i % 3 === 1 ? kits[1].p : "#fde047";
        ctx.strokeStyle = "#e2e8f0";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x, y - 34);
        ctx.stroke();
        ctx.fillStyle = col;
        const wave = (k: number): number => Math.sin(t * 5 + i + k * 1.4) * 3;
        ctx.beginPath();
        ctx.moveTo(x, y - 34);
        ctx.lineTo(x + 14, y - 33 + wave(1));
        ctx.lineTo(x + 26, y - 31 + wave(2));
        ctx.lineTo(x + 26, y - 19 + wave(2));
        ctx.lineTo(x + 14, y - 21 + wave(1));
        ctx.lineTo(x, y - 20);
        ctx.closePath();
        ctx.fill();
      }
    };
    const drawFireworks = (t: number): void => {
      const hy = Math.max(0, Math.min(H, cam.horizonY()));
      for (let b = 0; b < 5; b++) {
        const t0 = b * 0.8 + 0.2;
        const age = t - t0;
        if (age < 0 || age > 1.8) continue;
        const cx = W * (0.15 + pseudo(b, 8) * 0.7);
        const cy = hy * (0.25 + pseudo(b, 9) * 0.35);
        const col = ["#fde047", "#f472b6", "#60a5fa", "#4ade80", "#fb923c"][b % 5];
        for (let k = 0; k < 26; k++) {
          const ang = (k / 26) * Math.PI * 2;
          const rad = age * (46 + pseudo(k, b) * 34);
          ctx.globalAlpha = Math.max(0, 1 - age / 1.8);
          ctx.fillStyle = col;
          ctx.fillRect(cx + Math.cos(ang) * rad, cy + Math.sin(ang) * rad + age * age * 14, 3, 3);
        }
      }
      ctx.globalAlpha = 1;
    };

    let raf = 0;
    const frame = (): void => {
      if (!alive) return;
      const now = performance.now();
      const t = (now - started) / 1000;
      if (t >= total) return finish();
      sprites.length = 0;
      labels.length = 0;
      bubbles.length = 0;
      banner = null;
      state.trophy = null;
      flags = 0;
      confettiOn = 0;
      flash = 0;
      if (kind === "intro") introScene(t);
      else trophyScene(t);
      sprites.sort((a, b) => b.y - a.y);
      applyCam();
      ctx.clearRect(0, 0, W, H);
      drawBackdrop(ctx, cam, { home: kits[0], away: kits[1], t });
      if (flags) drawFlags(t);
      if (kind === "intro" && t < 4.4) drawFireworks(t);
      if (loCtx) {
        loCtx.clearRect(0, 0, lo.width, lo.height);
        drawStadium(loCtx, loCam, { home: kits[0], away: kits[1], t, backdrop: false });
        ctx.save();
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(lo, 0, 0, lo.width * PX, lo.height * PX);
        ctx.restore();
      }
      const items: LabelItem[] = [];
      for (const s of sprites) {
        const head = drawPlayer(ctx, cam, s);
        const lb = labels.find((l) => l.x === s.x && l.y === s.y);
        if (lb && head) items.push({ head, name: lb.name });
      }
      const tr = state.trophy as { x: number; y: number; h: number } | null;
      if (tr) {
        const base = cam.project([tr.x, tr.y, 1.5]);
        if (base) {
          const up = kind === "trophy" ? 0.9 : 0;
          const hpx = tr.h * base.s * 0.5;
          const ok = drawTrophySprite(ctx, base.x, base.y - (1.6 + up) * base.s - 0.2 * base.s, hpx, now / 1000);
          if (ok) {
            ctx.save();
            ctx.globalAlpha = 0.22 + 0.1 * Math.sin(now / 130);
            ctx.fillStyle = "#fde68a";
            ctx.beginPath();
            ctx.arc(base.x, base.y - (1.6 + up) * base.s - hpx * 0.55, hpx * 0.8, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
          }
        }
      }
      drawLabels(ctx, items);
      ctx.save();
      ctx.textAlign = "center";
      for (const b of bubbles) {
        const p = cam.project([b.x, b.y, b.z]);
        if (!p) continue;
        ctx.font = `${Math.round(Math.max(12, p.s * 0.6))}px system-ui, sans-serif`;
        ctx.fillStyle = "#fff";
        ctx.fillText(b.txt, p.x, p.y);
      }
      ctx.restore();
      if (confettiOn > 0) {
        ctx.save();
        for (const c of confetti) {
          const y = ((now / 1000) * c.v * 230 + c.ph * 90) % (H + 20) - 10;
          const x = c.x * W + Math.sin(now / 400 + c.ph) * 14;
          ctx.globalAlpha = confettiOn;
          ctx.fillStyle = c.c;
          ctx.fillRect(x, y, c.s, c.s * 1.6);
        }
        ctx.restore();
      }
      if (banner) drawBanner(ctx, W, H, banner[0], banner[2], banner[1], Math.min(1, 0.75 + (t % 1) * 0.25));
      if (flash > 0) {
        ctx.fillStyle = `rgba(255,255,255,${flash})`;
        ctx.fillRect(0, 0, W, H);
      }
      const fade = Math.max(1 - t / 0.8, (t - (total - 0.9)) / 0.9);
      if (fade > 0) {
        ctx.fillStyle = `rgba(0,0,0,${Math.min(1, fade)})`;
        ctx.fillRect(0, 0, W, H);
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => {
      alive = false;
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
    // a cutscene roda uma vez por montagem
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="fixed inset-y-0 left-1/2 z-[95] w-full max-w-[560px] -translate-x-1/2 overflow-hidden bg-black shadow-2xl">
      <div ref={wrapRef} className="absolute inset-0">
        <canvas ref={canvasRef} className="block touch-none select-none" />
      </div>
      <button type="button" onClick={() => (canvasRef.current as (HTMLCanvasElement & { __skip?: () => void }) | null)?.__skip?.()} className="absolute right-3 top-3 rounded-lg bg-black/60 px-3 py-1.5 text-xs font-black text-white/90">
        Pular ⏭
      </button>
    </div>
  );
}
