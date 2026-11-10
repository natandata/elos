"use client";

import { useEffect, useRef } from "react";
import { bestFormation, pickLineup, toPlayer, type Player } from "@/lib/arenasoccer/sim";
import { Sfx } from "@/lib/arenasoccer/sound";
import type { Kit, RosterPlayer, Team } from "@/lib/arenasoccer/teams";
import { Cam, drawBackdrop, drawBanner, drawPlayer, drawStadium, type Sprite } from "./pitch3d";
import { frameAt, lookOf, preloadSprites, type Anim, type Look } from "./sprites";

/** Os 11 titulares de um time (para as cutscenes usarem os jogadores de verdade). */
export function xiOf(team: Team): Player[] {
  const sq = team.players.map((p) => toPlayer(p as RosterPlayer));
  return pickLineup(sq, bestFormation(sq)).xi;
}

export type CutsceneKind = "intro" | "trophy";
type Actor = { id: string; kit: Kit; look: Look; name: string };

const REF_KIT: Kit = { p: "#16161a", s: "#16161a", k: "solid" };
const lerp = (a: number, b: number, t: number): number => a + (b - a) * Math.max(0, Math.min(1, t));
const ease = (t: number): number => {
  const k = Math.max(0, Math.min(1, t));
  return k * k * (3 - 2 * k);
};
const seg = (t: number, a: number, b: number): number => Math.max(0, Math.min(1, (t - a) / (b - a)));

/** 4-4-2 de cada metade: x lateral e y (profundidade) de cada um dos 10 jogadores de linha + goleiro. */
const FORM: [number, number][] = [[0, -3], [-8, -9], [-3, -9], [3, -9], [8, -9], [-9, -17], [-3, -16], [3, -16], [9, -17], [-3, -24], [3, -24]];

function squad(xi: Player[] | undefined, kit: Kit, tag: string): Actor[] {
  return Array.from({ length: 11 }, (_, i) => {
    const p = xi?.[i];
    const name = p?.name ?? `${tag}${i}`;
    return { id: `${tag}${i}`, kit, look: lookOf(p?.photo, name), name };
  });
}

/**
 * Cutscene de final de campeonato, desenhada em canvas com os mesmos jogadores em pixel art do jogo.
 * `intro`: os times entram em fila, o hino, a arrumação em campo e o apito do juiz.
 * `trophy`: apito final, a corrida até a torcida, o choro e os gritos, a taça erguida por todos e levada à torcida.
 */
export function Cutscene({ kind, title, mineName, oppName, kits, mineXI, oppXI, onEnd }: { kind: CutsceneKind; title: string; mineName: string; oppName: string; kits: [Kit, Kit]; mineXI?: Player[]; oppXI?: Player[]; onEnd: () => void }) {
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
    const total = kind === "intro" ? 15 : 19;
    const A = squad(mineXI, kits[0], "a");
    const B = squad(oppXI, kits[1], "b");
    const lo = document.createElement("canvas");
    const loCtx = lo.getContext("2d");
    const PX = 3;
    let W = 360;
    let H = 640;
    let cam = new Cam(W, H, [0, -40], [0, -10], { back: 8, zoom: 1 });
    let loCam = cam;
    let camState = { x: 0, y: -40, fx: 0, fy: -10, back: 8, zoom: 1 };
    const setCam = (): void => {
      const o = { back: camState.back, zoom: camState.zoom };
      cam = new Cam(W, H, [camState.x, camState.y], [camState.fx, camState.fy], o);
      lo.width = Math.ceil(W / PX);
      lo.height = Math.ceil(H / PX);
      loCam = new Cam(lo.width, lo.height, [camState.x, camState.y], [camState.fx, camState.fy], o);
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
      setCam();
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(wrap);

    const started = performance.now();
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

    // confete da festa
    const confetti = Array.from({ length: 90 }, (_, i) => ({ x: Math.random(), v: 0.25 + Math.random() * 0.5, ph: Math.random() * 6, c: ["#fde047", "#f87171", "#60a5fa", "#4ade80", "#fff"][i % 5], s: 3 + Math.random() * 4 }));

    const sprites: Sprite[] = [];
    const add = (a: Actor, x: number, y: number, anim: Anim, frame: number, extra: Partial<Sprite> = {}): void => {
      sprites.push({ x, y, kit: a.kit, name: a.id, pix: { anim, frame, look: a.look }, ...extra });
    };
    const bubbles: { x: number; y: number; txt: string }[] = [];

    const scene = (t: number): void => {
      sprites.length = 0;
      bubbles.length = 0;
      if (kind === "intro") {
        // câmera atrás da fila, olhando o centro do campo
        const cz = ease(seg(t, 0, 14));
        camState = { x: 0, y: -45, fx: 0, fy: lerp(-24, -20, cz), back: 5, zoom: lerp(1.1, 1.35, cz) };
        const walk = seg(t, 0.5, 5.5); // entrada em fila
        const line = ease(seg(t, 5.5, 7)); // forma a fila lado a lado
        const spread = ease(seg(t, 9.5, 12)); // vai para as posições
        const ref = { id: "ref", kit: REF_KIT, look: lookOf(undefined, "juiz"), name: "juiz" };
        // juiz entra na frente com a bola e para no centro
        const refY = lerp(-64, -38, ease(seg(t, 0, 5.5)));
        add(ref, lerp(0, 0, 1), refY, "run", frameAt(t * 1.3, 8, true));
        const sides: [Actor[], number][] = [[A, -1], [B, 1]];
        for (const [team, sd] of sides) {
          team.forEach((a, i) => {
            // fila indiana: cada um 2,4 m atrás do anterior; depois abre em linha de 10 m
            const fileY = lerp(-68 - i * 2.4, -42 - i * 2.4, ease(walk));
            const fileX = sd * 4;
            const lineX = sd * (1.8 + i * 0.78);
            const lineY = -39;
            // posição em campo: cada time na sua metade, no desenho 4-4-2
            const formX = sd * 6 + FORM[i][0] * 0.5;
            const formY = -34 + FORM[i][1] * 0.4;
            const x = lerp(lerp(fileX, lineX, line), formX, spread);
            const y = lerp(lerp(fileY, lineY, line), formY, spread);
            const moving = (t > 0.5 && t < 7.2) || (t > 9.5 && t < 12.2);
            add(a, x, y, "run", moving ? frameAt(t + i * 0.13, 8, true) : 0);
          });
        }
        // notas do hino
        if (t > 7 && t < 9.6) for (let i = 0; i < 6; i++) bubbles.push({ x: lerp(-9, 9, i / 5) + Math.sin(t * 2 + i) * 1.2, y: -25 - ((t * 4 + i * 2.2) % 5), txt: i % 2 ? "♪" : "♫" });
        if (t > 4.5) once("cheer1", () => sfx.cheer(5, 0.05));
        if (t > 12.4) once("whistle", () => sfx.whistle());
      } else {
        const dolly = ease(seg(t, 1.5, 6)) * 9 - ease(seg(t, 9, 11)) * 7 + ease(seg(t, 13, 17.5)) * 9; // a câmera acompanha a corrida, volta para a roda e segue à torcida
        camState = { x: 0, y: -45 + dolly, fx: 0, fy: -20 + dolly * 0.7, back: 5, zoom: lerp(1.1, 1.4, ease(seg(t, 9, 13))) };
        // fase 0-1.5 apito final; 1.5-6 corrida até a torcida; 6-9.5 choro e gritos; 9.5-13 taça ao alto; 13-18.5 taça até a torcida
        const run = ease(seg(t, 1.5, 6));
        const gather = ease(seg(t, 9, 11));
        const toFans = ease(seg(t, 13, 17.5));
        const trophyUp = ease(seg(t, 10.2, 12));
        const ref = { id: "ref", kit: REF_KIT, look: lookOf(undefined, "juiz"), name: "juiz" };
        add(ref, 6, lerp(-37, -35, ease(seg(t, 0, 1.5))), "run", 0);
        A.forEach((a, i) => {
          const startX = FORM[i][0] * 0.6, startY = -34 + FORM[i][1] * 0.4;
          const crowdX = (i - 5) * 1.3 + Math.sin(i * 7) * 1.2, crowdY = -16 - (i % 3) * 1.3;
          const circleX = (i - 5) * 0.8, circleY = -31 + (i % 2) * 1.3 - Math.abs(i - 5) * 0.1;
          let x = lerp(startX, crowdX, run);
          let y = lerp(startY, crowdY, run);
          x = lerp(x, circleX, gather);
          y = lerp(y, circleY, gather);
          y = lerp(y, circleY - 0.2 + 14 * toFans, toFans);
          x = lerp(x, circleX * 1.1, toFans);
          const running = (t > 1.5 && t < 6.4) || (t > 9 && t < 11.2) || (t > 13 && t < 17.7);
          let anim: Anim = "run";
          let frame = running ? frameAt(t + i * 0.11, 9, true) : 0;
          if (t > 6.2 && t < 9.2 || (t > 1.8 && t < 6 && i % 3 === 0)) {
            anim = "celebrate";
            frame = frameAt(t + i * 0.2, 5, true);
          }
          if (t > 11.5 && t < 13) {
            anim = "celebrate";
            frame = frameAt(t + i * 0.13, 6, true);
          }
          add(a, x, y, anim, frame, { lift: (anim === "celebrate" && (frame === 2 || frame === 3) ? 0.15 : 0) });
          if (t > 6.2 && t < 9.4 && i % 2 === 0) bubbles.push({ x, y: y - 0.6, txt: (i + Math.floor(t * 2)) % 4 === 0 ? "😭" : (i + Math.floor(t * 2)) % 4 === 1 ? "🗣️" : "🙌" });
        });
        // adversários caídos (de cabeça baixa), parados mais atrás
        B.slice(0, 6).forEach((a, i) => add(a, (i % 2 ? 1 : -1) * (11 + (i >> 1) * 3.4), -20 - (i % 3) * 2.2, "run", 0)); // adversários parados, longe, de lado
        if (t > 0.1) once("end", () => sfx.whistle());
        if (t > 1.2) once("cheer", () => sfx.cheer(9, 0.08));
        if (t > 11) once("goal", () => sfx.goal());
        if (t > 12.5) once("cheer2", () => sfx.cheer(6, 0.09));
        // posição da taça (centro do grupo, sobe e vai com ele para a torcida)
        trophyPos = { x: 0, y: lerp(-31, -17, toFans), up: trophyUp };
      }
      sprites.sort((a, b) => b.y - a.y);
    };
    let trophyPos = { x: 0, y: -31, up: 0 };

    const drawTrophy = (): void => {
      const base = cam.project([trophyPos.x, trophyPos.y, 2.9 + trophyPos.up * 0.6]);
      if (!base || trophyPos.up <= 0) return;
      const s = base.s * 0.55 * trophyPos.up;
      ctx.save();
      ctx.translate(base.x, base.y);
      ctx.imageSmoothingEnabled = false;
      const u = Math.max(2, Math.round(s / 6));
      const px = (c: string, x: number, y: number, w: number, h: number): void => {
        ctx.fillStyle = c;
        ctx.fillRect(x * u, -y * u, w * u, -h * u);
      };
      // taça em pixel art (dourada)
      px("#b45309", -5, 0, 10, 2);
      px("#fbbf24", -2, 2, 4, 5);
      px("#fbbf24", -6, 7, 12, 8);
      px("#fde68a", -5, 14, 3, 6);
      px("#fbbf24", -9, 13, 3, 3);
      px("#fbbf24", 6, 13, 3, 3);
      px("#f59e0b", 2, 7, 4, 8);
      px("#fff7", -4, 13, 1, 1);
      ctx.restore();
      // brilho
      ctx.save();
      ctx.globalAlpha = 0.25 + 0.15 * Math.sin(performance.now() / 120);
      ctx.fillStyle = "#fde68a";
      ctx.beginPath();
      ctx.arc(base.x, base.y - s * 2.2, s * 2.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    };

    let raf = 0;
    const frame = (): void => {
      if (!alive) return;
      const now = performance.now();
      const t = (now - started) / 1000;
      if (t >= total) return finish();
      scene(t);
      setCam();
      ctx.clearRect(0, 0, W, H);
      drawBackdrop(ctx, cam, { home: kits[0], away: kits[1], t });
      if (loCtx) {
        loCtx.clearRect(0, 0, lo.width, lo.height);
        drawStadium(loCtx, loCam, { home: kits[0], away: kits[1], t, backdrop: false });
        ctx.save();
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(lo, 0, 0, lo.width * PX, lo.height * PX);
        ctx.restore();
      }
      for (const s of sprites) drawPlayer(ctx, cam, s);
      drawTrophy();
      // balões (notas do hino, choro, gritos)
      ctx.save();
      ctx.textAlign = "center";
      for (const b of bubbles) {
        const p = cam.project([b.x, b.y, 2.2]);
        if (!p) continue;
        ctx.font = `${Math.round(Math.max(12, p.s * 0.7))}px system-ui, sans-serif`;
        ctx.fillStyle = "#fff";
        ctx.fillText(b.txt, p.x, p.y);
      }
      ctx.restore();
      // confete na parte final da comemoração
      if (kind === "trophy" && t > 11) {
        const k = Math.min(1, (t - 11) / 2);
        ctx.save();
        for (const c of confetti) {
          const y = ((now / 1000) * c.v * 220 + c.ph * 90) % (H + 20) - 10;
          const x = c.x * W + Math.sin(now / 400 + c.ph) * 14;
          ctx.globalAlpha = k;
          ctx.fillStyle = c.c;
          ctx.fillRect(x, y, c.s, c.s * 1.6);
        }
        ctx.restore();
      }
      // faixas de texto por momento
      const banner = ((): [string, string, string | null] | null => {
        if (kind === "intro") {
          if (t < 3.2) return [title.toUpperCase(), "#fde047", `${mineName} x ${oppName}`];
          if (t > 6.6 && t < 9.4) return ["HINO NACIONAL", "#fff", null];
          if (t > 12.5 && t < 14) return ["APITO INICIAL!", "#fde047", null];
          return null;
        }
        if (t < 2.4) return ["FIM DE JOGO!", "#fde047", null];
        if (t > 6.5 && t < 9) return ["É CAMPEÃO!", "#fff", null];
        if (t > 12 && t < 15) return [`${mineName.toUpperCase()} CAMPEÃO!`, "#fde047", title];
        return null;
      })();
      if (banner) drawBanner(ctx, W, H, banner[0], banner[2], banner[1], Math.min(1, 0.7 + (t % 1) * 0.3));
      // entrada e saída em preto
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
