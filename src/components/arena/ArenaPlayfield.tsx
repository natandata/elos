"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { ARENA_CARDS, ARENA_CARD_BY_KEY, shortName } from "@/lib/arena/cards";
import { ARENAS, type ArenaTheme } from "@/lib/arena/arenas";
import { CAMPAIGN_CARDS, CAMPAIGN_COMBOS, activeCombos, inCombo, type Combo } from "@/lib/arena/campaignCards";
import { drawLimbs } from "./arenaLimbs";
import { CardArt } from "./CardArt";
import { TEAM, buildAmbient, buildBackground, drawAmbient, drawRubble, drawTower, layoutFor, type Ambient, type Layout } from "./arenaRender";
import { loadCampo } from "./arenaAssets";
import { reportClientError } from "@/lib/clientErrors";
import { applyEvent, drawFx, newAnim, type Anim, type Fx } from "./arenaFx";
import { ArenaSound, readMuted } from "./arenaSound";
import { suspendMusic } from "./arenaMusicEngine";
import {
  DOUBLE_MANA_TICK,
  deployRects,
  H,
  MANA_MAX,
  MATCH_TICKS,
  MAX_MATCH_TICKS,
  TICKS_PER_SEC,
  W,
  type Entity,
  type GameEvent,
  type GameState,
  type Side,
} from "@/lib/arena/core";
import { AT } from "./ArenaText";
import { glyph } from "./arenaGlyph";

/** Quem comanda a partida: contra o computador ou 1x1 (lockstep). */
export type PlayDriver = {
  game: GameState;
  /** lado (equipe) de quem joga: define a visão do campo e as coroas */
  mySide: Side;
  /** número do jogador (só nas duplas, 0–3); no resto é igual ao lado */
  myPlayer?: number;
  /** índice da arena (cenário) */
  arena: number;
  /** campanha: cenário próprio (cores, desenho e nome) no lugar das arenas bíblicas */
  campaign?: { theme: ArenaTheme; scenery: string; name: string };
  /** nome de quem está do outro lado */
  opponentLabel: string;
  /** atraso das jogadas em ticks (1x1); 0 = imediato */
  inputDelay: number;
  /** roda um tick; null = esperando o colega */
  advance: () => GameEvent[] | null;
  /** o jogador soltou a carta `slot` em (x, y), já em coordenadas do jogo */
  place: (slot: number, x: number, y: number) => boolean;
  /** essa carta já tem jogada agendada? */
  isPending: (slot: number) => boolean;
};

type Hud = { mana: number; tick: number; mine: number; theirs: number; slots: string[]; next: string };

const STEP_MS = 1000 / TICKS_PER_SEC;

function fmtTime(ticks: number): string {
  // no Jericó o relógio mostra o que resta da morte súbita
  const s = Math.max(0, Math.ceil(((ticks >= MATCH_TICKS ? MAX_MATCH_TICKS : MATCH_TICKS) - ticks) / TICKS_PER_SEC));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

/** Como o corpo do herói se mexe ao golpear de perto: recuo, avanço e pulo. */
const ATK_BODY_DEFAULT = { wind: 1, lunge: 1, hop: 0 };
const ATK_BODY: Record<string, { wind: number; lunge: number; hop: number }> = {
  sansao: { wind: 1.9, lunge: 1.25, hop: 0.45 }, // levanta a clava e desce com tudo
  daniel: { wind: 0.8, lunge: 1.5, hop: 0.1 }, // bote do leão
  joao: { wind: 0.6, lunge: 1.1, hop: 0 },
  gideao: { wind: 0.6, lunge: 0.8, hop: 0 },
  miguel: { wind: 1.1, lunge: 1.2, hop: 0.3 },
  josue: { wind: 1.4, lunge: 1.1, hop: 0.15 },
  noe: { wind: 1.2, lunge: 0.9, hop: 0.15 },
  adao: { wind: 1.1, lunge: 1.1, hop: 0.1 },
  jaco: { wind: 1.2, lunge: 1.15, hop: 0 },
  nabucodonosor: { wind: 1.5, lunge: 1.0, hop: 0.2 },
};

/** Pãozinho de Maná (custo das cartas e Maná atual). */
function ManaBread({ n, size = 28 }: { n: number; size?: number }) {
  return (
    <span className="relative inline-flex items-center justify-center drop-shadow-[0_2px_2px_rgba(0,0,0,0.5)]" style={{ width: size, height: size }}>
      <svg viewBox="0 0 40 40" className="absolute inset-0 h-full w-full" aria-hidden>
        <defs>
          <radialGradient id="mana-bread" cx="0.4" cy="0.28" r="0.9">
            <stop offset="0" stopColor="#ffe27a" />
            <stop offset="0.5" stopColor="#f5b50f" />
            <stop offset="1" stopColor="#d9820a" />
          </radialGradient>
        </defs>
        <path d="M4 24 C4 11 12 5.5 20 5.5 C28 5.5 36 11 36 24 C36 31.5 29 35.5 20 35.5 C11 35.5 4 31.5 4 24 Z" fill="url(#mana-bread)" stroke="#7a3f08" strokeWidth="2.4" strokeLinejoin="round" />
        <g fill="none" strokeLinecap="round">
          <path d="M12 13.5 L15.5 19.5 M19 11.5 L22.5 17.5 M26 13.5 L29.5 19.5" stroke="#a65a0b" strokeWidth="2.6" />
          <path d="M13.2 13 L16.5 18.6 M20.2 11 L23.5 16.6 M27.2 13 L30.5 18.6" stroke="#ffe9a0" strokeWidth="1" opacity="0.8" />
        </g>
        <ellipse cx="11" cy="22" rx="3.2" ry="1.6" fill="#fff4b8" opacity="0.5" transform="rotate(-50 11 22)" />
        </svg>
      <span
        className="relative font-black leading-none text-[#5a2f05]"
        style={{ fontSize: size * 0.5, marginTop: size * 0.2, textShadow: "0 0 3px #fff3b0, 0 0 2px #fff3b0" }}
      >
        {n}
      </span>
    </span>
  );
}

function CrownCount({ n, color }: { n: number; color: "red" | "blue" }) {
  return (
    <div className="flex flex-col items-center">
      <span className={`min-w-8 rounded-md border-2 border-black/60 bg-black/70 px-1.5 text-center text-lg font-black tabular-nums ${color === "red" ? "text-red-400" : "text-sky-300"}`}>
        {n}
      </span>
      <span
        className="-mt-1 text-4xl drop-shadow-[0_2px_2px_rgba(0,0,0,0.6)]"
        style={{ filter: color === "red" ? "hue-rotate(-35deg) saturate(2.4)" : "hue-rotate(170deg) saturate(1.8)" }}
        aria-hidden
      ><AT>
        👑
      </AT></span>
    </div>
  );
}

export function ArenaPlayfield({
  driver,
  onOver,
  onLeave,
  extra,
}: {
  driver: PlayDriver;
  onOver: () => void;
  onLeave: () => void;
  /** avisos por cima do campo (ex.: colega desconectado) */
  extra?: ReactNode;
}) {
  const flip = driver.mySide === 1;
  const driverRef = useRef(driver);
  driverRef.current = driver;
  const onOverRef = useRef(onOver);
  onOverRef.current = onOver;

  const [hud, setHud] = useState<Hud | null>(null);
  /** clarão do Pastor Zepa: cada vez que cega o meu lado, sobe um número e a tela fica branca por 1,5 s */
  const [blindKey, setBlindKey] = useState(0);
  /** Jericó: sobe um número quando a morte súbita começa (mostra o aviso por 3 s) */
  const [jerichoKey, setJerichoKey] = useState(0);
  const jerichoSeen = useRef(false);
  const [comboMsg, setComboMsg] = useState<{ mine: boolean; n: number; combo: Combo } | null>(null);
  const comboPrev = useRef<Set<string>>(new Set());
  const [selected, setSelected] = useState<number | null>(null);
  const [waiting, setWaiting] = useState(false);
  const [muted, setMuted] = useState(readMuted);
  useEffect(() => suspendMusic(), []);
  const soundRef = useRef<ArenaSound | null>(null);
  const lastSecRef = useRef(-1);
  const crownsRef = useRef<[number, number]>([0, 0]);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const areaRef = useRef<HTMLDivElement | null>(null);
  const bgRef = useRef<HTMLCanvasElement | null>(null);
  const ambRef = useRef<Ambient | null>(null);
  const layoutRef = useRef<Layout | null>(null);
  const dprRef = useRef(1);
  const fxRef = useRef<Fx[]>([]);
  const animsRef = useRef<Map<number, Anim>>(new Map());
  const shakeRef = useRef({ until: -1, amp: 0 });
  const selectedRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);
  const spritesRef = useRef<Record<string, HTMLImageElement>>({});
  selectedRef.current = selected;

  // posição no jogo -> posição na tela (o 2º jogador vê o campo girado)
  const vx = useCallback((x: number) => (flip ? W - x : x), [flip]);
  const vy = useCallback((y: number) => (flip ? H - y : y), [flip]);
  const vs = useCallback((s: Side): Side => (flip ? ((1 - s) as Side) : s), [flip]);

  useEffect(() => {
    const snd = new ArenaSound();
    soundRef.current = snd;
    snd.unlock();
    return () => {
      snd.close();
      soundRef.current = null;
    };
  }, []);

  useEffect(() => {
    for (const c of [...ARENA_CARDS, ...CAMPAIGN_CARDS]) {
      if (!c.art || c.kind !== "unit") continue;
      for (const k of c.crew ?? [c.key]) {
        if (spritesRef.current[k]) continue;
        const img = new Image();
        img.src = `/arena/${k}.webp`;
        spritesRef.current[k] = img;
      }
    }
  }, []);

  const stopLoop = useCallback(() => {
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
  }, []);
  useEffect(() => stopLoop, [stopLoop]);

  // telas grandes só saem da memória quando o navegador resolve limpar: celulares fracos estouram o limite na 2ª partida (campo verde/travado). Zerar o tamanho libera na hora.
  const freeCanvases = useCallback(() => {
    for (const c of [bgRef.current, ambRef.current?.tile ?? null]) {
      if (c) {
        c.width = 0;
        c.height = 0;
      }
    }
    bgRef.current = null;
    ambRef.current = null;
  }, []);
  const sizeKeyRef = useRef("");
  const retryRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const triesRef = useRef(0);
  const setupCanvas = useCallback((force = false) => {
    const area = areaRef.current;
    const canvas = canvasRef.current;
    if (!area || !canvas) return;
    // área ainda sem tamanho (a tela está montando ou o navegador está trocando a barra): tenta de novo logo em vez de desistir
    if (area.clientWidth < 8 || area.clientHeight < 8) {
      if (triesRef.current++ < 60 && retryRef.current === null) {
        retryRef.current = setTimeout(() => {
          retryRef.current = null;
          setupCanvas(force);
        }, 120);
      }
      return;
    }
    triesRef.current = 0;
    const l = layoutFor(area.clientWidth, area.clientHeight);
    // menos pixels em aparelhos fracos: o campo é desenhado todo quadro, e memória de vídeo acabando faz a tela piscar
    const lowMem = ((navigator as unknown as { deviceMemory?: number }).deviceMemory ?? 8) <= 4;
    const budget = Math.sqrt((lowMem ? 700_000 : 1_300_000) / Math.max(1, l.cw * l.ch));
    const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1, budget));
    const key = `${l.cw}x${l.ch}@${dpr}`;
    // mesmo tamanho de antes: não mexe no canvas (redimensionar apaga a tela e fazia o campo piscar)
    if (!force && key === sizeKeyRef.current && bgRef.current) return;
    sizeKeyRef.current = key;
    canvas.style.width = `${l.cw}px`;
    canvas.style.height = `${l.ch}px`;
    canvas.width = Math.max(1, Math.round(l.cw * dpr));
    canvas.height = Math.max(1, Math.round(l.ch * dpr));
    layoutRef.current = l;
    dprRef.current = dpr;
    const build = () => {
      freeCanvases();
      const theme = driverRef.current.campaign?.theme ?? ARENAS[driverRef.current.arena]?.theme ?? ARENAS[0].theme;
      const key2 = driverRef.current.campaign?.scenery ?? ARENAS[driverRef.current.arena]?.key;
      try {
        bgRef.current = buildBackground(l, dpr, theme, key2);
      } catch (err) {
        console.error("arena background", err);
        reportClientError("arena-bg", err, { cw: l.cw, ch: l.ch, dpr, key: key2 });
        // aparelho sem memória/contexto: tenta de novo em resolução baixa; sem fundo a tela ficaria só verde
        try {
          if (dpr > 1) {
            canvas.width = l.cw;
            canvas.height = l.ch;
            dprRef.current = 1;
          }
          bgRef.current = buildBackground(l, 1, theme, key2);
        } catch (err2) {
          console.error("arena background (fallback)", err2);
          reportClientError("arena-bg-fallback", err2, { cw: l.cw, ch: l.ch });
          bgRef.current = null;
        }
      }
      try {
        ambRef.current = buildAmbient(l, theme);
      } catch (err) {
        console.error("arena ambient", err);
        ambRef.current = null;
      }
    };
    build();
    // os sprites do campo (torres, árvores, ponte...) chegam depois: refaz o fundo quando prontos, sem piscar
    void loadCampo().then(() => {
      if (canvasRef.current && layoutRef.current === l) build();
    });
  }, [freeCanvases]);

  // ------------------------------------------------------------ desenho
  const draw = useCallback(
    (alpha: number) => {
      const canvas = canvasRef.current;
      const game = driverRef.current.game;
      const l = layoutRef.current;
      const bg = bgRef.current;
      if (!canvas || !l) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      const s = l.s;
      const mySide = driverRef.current.mySide;
      const tickF = game.tick + alpha;
      ctx.setTransform(dprRef.current, 0, 0, dprRef.current, 0, 0);
      ctx.clearRect(0, 0, l.cw, l.ch);
      if (bg && bg.width > 0 && bg.height > 0) ctx.drawImage(bg, 0, 0, l.cw, l.ch);
      else {
        // sem o fundo pronto o campo ainda aparece (grama lisa) e o jogo continua
        const th = driverRef.current.campaign?.theme ?? ARENAS[driverRef.current.arena]?.theme ?? ARENAS[0].theme;
        ctx.fillStyle = th.grass;
        ctx.fillRect(0, 0, l.cw, l.ch);
      }
      if (ambRef.current) drawAmbient(ctx, ambRef.current, tickF);
      if (game.jericho) drawJericho(ctx, l.cw, l.ch, s, tickF);
      ctx.save();
      const sh = shakeRef.current;
      const left = sh.until - tickF;
      const shx = left > 0 ? Math.sin(tickF * 53) * sh.amp * Math.min(1, left / 6) : 0;
      const shy = left > 0 ? Math.cos(tickF * 41) * sh.amp * Math.min(1, left / 6) : 0;
      ctx.translate(l.ox + shx, l.oy + shy);

      // zona de colocação quando há uma carta de tropa escolhida (sempre embaixo, na tela)
      const sel = selectedRef.current;
      if (sel !== null) {
        const card = ARENA_CARD_BY_KEY.get(game.slots[driverRef.current.myPlayer ?? mySide][sel]);
        if (card?.kind === "unit") {
          const pulse = 0.16 + Math.sin(tickF * 0.25) * 0.05;
          // zona (inclusive a liberada por torre derrubada), já no ponto de vista de quem joga
          for (const r of deployRects(mySide, game)) {
            const x0 = flip ? W - r.x1 : r.x0;
            const x1 = flip ? W - r.x0 : r.x1;
            const y0 = flip ? H - r.y1 : r.y0;
            const y1 = flip ? H - r.y0 : r.y1;
            ctx.fillStyle = `rgba(255,255,255,${pulse})`;
            ctx.fillRect(x0 * s, y0 * s, (x1 - x0) * s, (y1 - y0) * s);
            // contorno escuro por baixo: a linha branca aparece mesmo sobre grama clara
            ctx.strokeStyle = "rgba(0,0,0,0.55)";
            ctx.lineWidth = 5;
            ctx.strokeRect(x0 * s, y0 * s, (x1 - x0) * s, (y1 - y0) * s);
            ctx.strokeStyle = "rgba(255,255,255,0.95)";
            ctx.lineWidth = 2.5;
            ctx.setLineDash([8, 6]);
            ctx.lineDashOffset = -tickF;
            ctx.strokeRect(x0 * s, y0 * s, (x1 - x0) * s, (y1 - y0) * s);
            ctx.setLineDash([]);
          }
        }
      }

      // escombros das torres que já caíram
      drawRubble(ctx, s, game.entities, tickF);

      // entidades já no ponto de vista de quem joga
      const view = (e: Entity): Entity =>
        flip ? { ...e, x: W - e.x, y: H - e.y, px: W - e.px, py: H - e.py, side: vs(e.side) } : e;
      const lerp = (a: number, b: number) => a + (b - a) * alpha;
      const ordered = game.entities.map(view).sort((a, b) => (a.type === b.type ? a.y - b.y : a.type === "tower" ? -1 : 1));
      const namesDrawn: { x: number; y: number }[] = [];
      const comboOn = [activeCombos(game.entities, 0), activeCombos(game.entities, 1)];
      for (const e of ordered) {
        const an = animsRef.current.get(e.id);
        if (e.type === "tower") {
          drawTower(ctx, s, e, tickF, an ? tickF - an.hit : 99, an ? tickF - an.atk : 99);
          continue;
        }
        const x = lerp(e.px, e.x) * s;
        const y = lerp(e.py, e.y) * s;
        const r = e.radius * s;
        const img = spritesRef.current[ARENA_CARD_BY_KEY.get(e.card)?.crew?.[e.variant] ?? e.card];
        const hasArt = !!img && img.complete && img.naturalWidth > 0;
        const footBase = y + r * 0.9;
        const lift = e.flying ? 0.9 * s : 0;

        const age = an ? tickF - an.born : 99;
        const spawnP = Math.min(1, age / 9);
        const popScale = spawnP < 1 ? 0.35 + 0.65 * (1 - Math.pow(1 - spawnP, 3) + Math.sin(spawnP * Math.PI) * 0.12) : 1;
        const dropY = spawnP < 1 ? -(1 - spawnP) * 1.3 * s : 0;
        const moving = !!an?.moving;
        const gait = (an?.walk ?? 0) * 3.6;
        const hop = Math.abs(Math.sin(gait));
        // balanço: caminhada quica e se estica no ar / amassa ao pisar; parado respira
        let bob = moving ? hop * 0.1 * r * 4 : Math.sin(tickF * 0.16 + e.id) * 0.02 * r * 4;
        let sx = moving ? 1 - (hop - 0.5) * 0.05 : 1 - Math.sin(tickF * 0.16 + e.id) * 0.012;
        let sy = moving ? 1 + (hop - 0.5) * 0.07 : 1 + Math.sin(tickF * 0.16 + e.id) * 0.02;
        // inclina pro lado em que anda e alterna a cada passo
        let sway = moving ? Math.sin(gait) * 0.07 + (an?.face ?? 1) * 0.04 : Math.sin(tickF * 0.08 + e.id * 3) * 0.012;
        if (e.flying) {
          bob = Math.sin(tickF * 0.2 + e.id) * 0.16 * s;
          sx *= 1 + Math.sin(tickF * 0.9 + e.id) * 0.05; // bater de asas
          sy *= 1 - Math.sin(tickF * 0.9 + e.id) * 0.025;
        }
        // pousa: amassa quando termina a entrada
        if (spawnP > 0.75 && spawnP < 1) {
          const k = Math.sin(((spawnP - 0.75) / 0.25) * Math.PI);
          sx *= 1 + 0.12 * k;
          sy *= 1 - 0.12 * k;
        }
        let thrustX = 0;
        let thrustY = 0;
        if (an) {
          // ataque: prepara (recua), dispara (avança rápido) e volta
          const a = tickF - an.atk;
          const W_ATK = 9;
          const style = ATK_BODY[e.card] ?? ATK_BODY_DEFAULT;
          if (a >= 0 && a < W_ATK) {
            const t = a / W_ATK;
            let off: number;
            if (an.ranged) {
              off = -0.24 * Math.sin(Math.min(1, t * 1.6) * Math.PI);
              sway += -0.1 * an.face * Math.sin(t * Math.PI);
              sx *= 1 - 0.05 * Math.sin(t * Math.PI);
              sy *= 1 + 0.05 * Math.sin(t * Math.PI);
            } else if (t < 0.28) {
              const u = t / 0.28;
              off = -0.22 * u * style.wind;
              sx *= 1 - 0.05 * u;
              sy *= 1 + 0.06 * u;
              sway += -0.12 * an.face * u * style.wind;
              bob += style.hop * s * u;
            } else if (t < 0.5) {
              const u = (t - 0.28) / 0.22;
              const e3 = 1 - Math.pow(1 - u, 3);
              off = -0.22 * style.wind + (0.92 * style.lunge + 0.22 * style.wind) * e3;
              sx *= 1 + 0.12 * e3;
              sy *= 1 - 0.1 * e3;
              sway += 0.28 * an.face * e3 - 0.12 * an.face * style.wind * (1 - e3);
              bob += style.hop * s * (1 - e3);
            } else {
              const u = (t - 0.5) / 0.5;
              const e2 = u * u * (3 - 2 * u);
              off = 0.7 * style.lunge * (1 - e2);
              sx *= 1 + 0.12 * (1 - e2);
              sy *= 1 - 0.1 * (1 - e2);
              sway += 0.28 * an.face * (1 - e2);
            }
            thrustX = an.atkDx * off * s;
            thrustY = an.atkDy * off * s * 0.7;
          }
          // apanhou: tranco pra trás e amassa
          const h = tickF - an.hit;
          if (h >= 0 && h < 6) {
            const k = 1 - h / 6;
            const push = 0.3 * k * k * s;
            thrustX += an.hitDx * push;
            thrustY += an.hitDy * push * 0.7;
            sx *= 1 + 0.1 * k;
            sy *= 1 - 0.1 * k;
            sway += an.hitDx * 0.12 * k;
          }
          // vira de lado suavemente
          an.fs += (an.face - an.fs) * 0.3;
        }
        const flash = an !== undefined && tickF - an.hit < 3;

        const lowFactor = 1 - Math.min(0.3, Math.abs(bob) / (s * 1.2));
        ctx.fillStyle = "rgba(0,0,0,0.28)";
        ctx.beginPath();
        ctx.ellipse(x, footBase, r * 1.05 * lowFactor * popScale, r * 0.42 * lowFactor * popScale, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = TEAM[e.side];
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.ellipse(x, footBase, r * 1.15 * popScale, r * 0.5 * popScale, 0, 0, Math.PI * 2);
        ctx.stroke();

        ctx.save();
        ctx.translate(x + thrustX, footBase - lift - bob + dropY + thrustY);
        ctx.rotate(sway);
        ctx.scale((an?.fs ?? 1) * sx * popScale, sy * popScale);
        let topLocal = -r;
        if (hasArt && img) {
          const h = e.radius * 4.4 * s;
          const w = (h * img.naturalWidth) / img.naturalHeight;
          const glowCombo = comboOn[e.side].find((c) => inCombo(c, e.card));
          if (glowCombo) {
            // combo Henrique + Amandinha: o personagem brilha
            const pulse = 0.5 + 0.5 * Math.sin(tickF * 0.35 + e.id);
            const g = ctx.createRadialGradient(0, -h * 0.5, 0, 0, -h * 0.5, h * 0.85);
            const blue = glowCombo.glow === "blue";
            g.addColorStop(0, blue ? `rgba(150,220,255,${0.5 + pulse * 0.25})` : `rgba(255,240,150,${0.5 + pulse * 0.25})`);
            g.addColorStop(1, blue ? "rgba(60,160,255,0)" : "rgba(255,200,60,0)");
            ctx.fillStyle = g;
            ctx.beginPath();
            ctx.ellipse(0, -h * 0.5, h * 0.7, h * 0.85, 0, 0, Math.PI * 2);
            ctx.fill();
          }
          if (!e.flying && e.variant === 0) {
            const atkT = an ? (tickF - an.atk) / 9 : -1;
            drawLimbs(ctx, img, -w / 2, -h * 0.97, w, h, gait, moving, atkT >= 0 && atkT < 1 ? atkT : -1, 1, tickF * 0.16 + e.id);
          } else {
            ctx.drawImage(img, -w / 2, -h * 0.97, w, h);
          }
          // levou dano: o personagem clareia por um instante (soma de luz, sem ctx.filter, que pisca e pesa em muitos celulares)
          if (flash) {
            ctx.globalCompositeOperation = "lighter";
            ctx.globalAlpha = 0.5;
            ctx.drawImage(img, -w / 2, -h * 0.97, w, h);
            ctx.globalAlpha = 1;
            ctx.globalCompositeOperation = "source-over";
          }
          topLocal = -h - 2;
        } else {
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.font = `${Math.max(14, e.radius * 2.4 * s)}px system-ui, "Segoe UI Emoji", "Apple Color Emoji", sans-serif`;
          ctx.fillStyle = "#000";
          glyph(ctx, ARENA_CARD_BY_KEY.get(e.card)?.emoji ?? "❔", 0, -r * 0.9, Math.max(14, e.radius * 2.4 * s));
          topLocal = -r * 1.9;
        }
        ctx.restore();

        const headY = footBase - lift - bob + dropY + topLocal * popScale;
        if (e.hp < e.maxHp) {
          const bw = Math.max(r * 2, 0.9 * s);
          const by = headY - 7;
          ctx.fillStyle = "rgba(0,0,0,0.65)";
          ctx.fillRect(x - bw / 2 - 1, by - 1, bw + 2, 6);
          ctx.fillStyle = TEAM[e.side];
          ctx.fillRect(x - bw / 2, by, Math.max(0, (e.hp / e.maxHp) * bw), 4);
        }
        // nome do personagem, pequenininho, em cima dele
        const card = ARENA_CARD_BY_KEY.get(e.card);
        // um nome por grupo: tropas coladas (ex.: os 3 Gideões) dividem o mesmo rótulo
        const crowded = namesDrawn.some((n) => Math.abs(n.x - x) < s * 1.3 && Math.abs(n.y - headY) < s * 0.7);
        if (card && spawnP >= 1 && !crowded && !(card.crew && e.variant > 0)) {
          namesDrawn.push({ x, y: headY });
          const fs = Math.max(8, Math.round(s * 0.33));
          const ny = headY - (e.hp < e.maxHp ? 11 : 3);
          ctx.font = `800 ${fs}px system-ui, "Segoe UI", sans-serif`;
          ctx.textAlign = "center";
          ctx.textBaseline = "alphabetic";
          ctx.lineJoin = "round";
          ctx.lineWidth = Math.max(2, fs * 0.28);
          ctx.strokeStyle = "rgba(10,14,24,0.85)";
          ctx.strokeText(shortName(card), x, ny);
          ctx.fillStyle = e.side === 0 ? "#dbeafe" : "#fecaca";
          ctx.fillText(shortName(card), x, ny);
        }
      }

      drawFx(ctx, s, fxRef.current, tickF, spritesRef.current);
      ctx.restore();
    },
    [flip, vs],
  );

  // ------------------------------------------------------------ laço
  const startLoop = useCallback(() => {
    // um erro de desenho num aparelho antigo não pode parar o jogo: ignora o quadro e segue
    const safeDraw = (alpha: number) => {
      try {
        draw(alpha);
      } catch (err) {
        console.error("arena draw", err);
        reportClientError("arena-draw", err);
      }
    };
    let last = performance.now();
    let acc = 0;
    let stalledSince: number | null = null;
    let noBgFrames = 0;
    const tick = (now: number): boolean => {
      const d = driverRef.current;
      const game = d.game;
      acc += Math.min(250, now - last);
      last = now;
      let guard = 0;
      let wasStalled = false;
      while (acc >= STEP_MS && !game.over && guard++ < 10) {
        const ev = d.advance();
        if (ev === null) {
          wasStalled = true;
          acc = Math.min(acc, STEP_MS);
          break;
        }
        for (const e of game.entities) {
          let an = animsRef.current.get(e.id);
          if (!an) {
            an = newAnim(game.tick - (e.type === "tower" ? 999 : 0), vs(e.side));
            animsRef.current.set(e.id, an);
          }
          const mdx = (flip ? -1 : 1) * (e.x - e.px);
          const mdy = e.y - e.py;
          const moved = Math.sqrt(mdx * mdx + mdy * mdy);
          an.moving = moved > 0.004;
          if (an.moving) {
            an.walk += moved;
            if (Math.abs(mdx) > 0.003) an.face = mdx > 0 ? 1 : -1;
            // a cada passo, uma nuvenzinha de poeira nos pés (só quem anda no chão)
            const step = Math.floor((an.walk * 3.6) / Math.PI);
            if (step > an.steps) {
              an.steps = step;
              if (!e.flying && e.type === "unit" && fxRef.current.length < 120) {
                fxRef.current.push({ k: "dust", x: vx(e.x), y: vy(e.y) + e.radius * 0.9, t0: game.tick, dur: 9, big: e.card === "nery" });
              }
            }
          }
        }
        for (const e of ev) {
          if (e.t === "blind" && e.side === d.mySide) setBlindKey((k) => k + 1);
          const m: GameEvent = flip ? mapEvent(e, vs) : e;
          applyEvent(m, game.tick, animsRef.current, fxRef.current, shakeRef.current);
          try {
            soundRef.current?.onEvent(m);
          } catch (err) {
            // o som nunca pode derrubar a partida (aparelhos sem Web Audio completo)
            reportClientError("arena-sound", err);
            soundRef.current = null;
          }
        }
        fxRef.current = fxRef.current.filter((f) => game.tick - f.t0 < f.dur);
        if (game.tick % 5 === 0) {
          // combo Henrique + Amandinha acabou de se formar: avisa
          for (const side of [0, 1] as const) {
            const now = new Set(activeCombos(game.entities, side).map((c) => c.id));
            for (const c of CAMPAIGN_COMBOS) {
              const k = `${side}:${c.id}`;
              if (now.has(c.id) && !comboPrev.current.has(k)) setComboMsg({ mine: side === d.mySide, n: game.tick, combo: c });
              if (now.has(c.id)) comboPrev.current.add(k);
              else comboPrev.current.delete(k);
            }
          }
        }
        acc -= STEP_MS;
        if (game.jericho && !jerichoSeen.current) {
          jerichoSeen.current = true;
          setJerichoKey((k) => k + 1);
          soundRef.current?.doubleMana();
        }
        // sons de marco: maná em dobro, contagem final e coroas
        const snd = soundRef.current;
        if (snd) {
          if (game.tick === DOUBLE_MANA_TICK) snd.doubleMana();
          const left = Math.ceil((MATCH_TICKS - game.tick) / TICKS_PER_SEC);
          if (left !== lastSecRef.current) {
            lastSecRef.current = left;
            if (left <= 10 && left >= 1 && game.tick % TICKS_PER_SEC === 0) snd.tick(left);
          }
          const mc = game.crowns[d.mySide];
          const tc = game.crowns[1 - d.mySide];
          if (mc > crownsRef.current[0]) snd.crown(true);
          if (tc > crownsRef.current[1]) snd.crown(false);
          crownsRef.current = [mc, tc];
        }
        if (game.tick % 4 === 0 || game.over) {
          const me = d.mySide;
          const pl = d.myPlayer ?? me;
          setHud({
            mana: game.mana[pl],
            tick: game.tick,
            mine: game.crowns[me],
            theirs: game.crowns[1 - me],
            slots: [...game.slots[pl]],
            next: game.queue[pl][0],
          });
        }
      }
      if (wasStalled) {
        if (stalledSince === null) stalledSince = now;
        else if (now - stalledSince > 350) setWaiting(true);
      } else if (stalledSince !== null) {
        stalledSince = null;
        setWaiting(false);
      }
      // fundo ainda não pronto (ou perdido): tenta montar de novo a cada segundo, sem parar o jogo
      if (!bgRef.current && ++noBgFrames % 60 === 0) setupCanvas(true);
      safeDraw(Math.min(1, acc / STEP_MS));
      if (game.over) {
        safeDraw(1);
        if (game.winner === d.mySide) soundRef.current?.win();
        else if (game.winner !== null) soundRef.current?.lose();
        onOverRef.current();
        return true;
      }
      return false;
    };
    // um erro num quadro não pode matar o laço (a tela ficava congelada ou em branco): registra e segue no próximo
    const frame = (now: number) => {
      let over = false;
      try {
        over = tick(now);
      } catch (err) {
        console.error("arena loop", err);
        reportClientError("arena-loop", err);
        last = now;
      }
      if (!over) rafRef.current = requestAnimationFrame(frame);
    };
    rafRef.current = requestAnimationFrame(frame);
  }, [draw, flip, vs, vx, vy, setupCanvas]);

  useEffect(() => {
    const game = driver.game;
    const me = driver.myPlayer ?? driver.mySide;
    setHud({ mana: game.mana[me], tick: game.tick, mine: 0, theirs: 0, slots: [...game.slots[me]], next: game.queue[me][0] });
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const mainCanvas = canvasRef.current;
    setupCanvas();
    const area = areaRef.current;
    let roPending = 0;
    const ro = area
      ? new ResizeObserver(() => {
          // vários avisos de tamanho no mesmo quadro viram um só
          cancelAnimationFrame(roPending);
          roPending = requestAnimationFrame(() => setupCanvas());
        })
      : null;
    if (area && ro) ro.observe(area);
    startLoop();
    const onErr = (e: ErrorEvent) => reportClientError("arena-window", e.error ?? e.message);
    const onRej = (e: PromiseRejectionEvent) => reportClientError("arena-promise", e.reason);
    window.addEventListener("error", onErr);
    window.addEventListener("unhandledrejection", onRej);
    // a barra do navegador do celular aparece e some: reajusta o campo no tamanho novo
    const vv = window.visualViewport;
    const onVv = () => setupCanvas();
    vv?.addEventListener("resize", onVv);
    return () => {
      document.body.style.overflow = prev;
      ro?.disconnect();
      stopLoop();
      window.removeEventListener("error", onErr);
      window.removeEventListener("unhandledrejection", onRej);
      vv?.removeEventListener("resize", onVv);
      if (retryRef.current !== null) clearTimeout(retryRef.current);
      freeCanvases();
      if (mainCanvas) {
        const main = mainCanvas;
        main.width = 0;
        main.height = 0;
      }
    };
    // o campo é montado uma vez por partida
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function onCanvasPointer(ev: React.PointerEvent<HTMLCanvasElement>) {
    const d = driverRef.current;
    soundRef.current?.unlock();
    const slot = selectedRef.current;
    const l = layoutRef.current;
    if (d.game.over || slot === null || !l) return;
    const rect = ev.currentTarget.getBoundingClientRect();
    const k = l.cw / rect.width;
    const x = ((ev.clientX - rect.left) * k - l.ox) / l.s;
    const y = ((ev.clientY - rect.top) * k - l.oy) / l.s;
    const gx = vx(x);
    const gy = vy(y);
    if (!d.place(slot, gx, gy)) return;
    if (d.inputDelay > 0) {
      const card = ARENA_CARD_BY_KEY.get(d.game.slots[d.myPlayer ?? d.mySide][slot]);
      fxRef.current.push({ k: "mark", x, y, emoji: card?.emoji ?? "❔", t0: d.game.tick, dur: d.inputDelay + 1 });
    }
    setSelected(null);
  }

  // ------------------------------------------------------------ tela
  const d = driver;
  const slots = hud?.slots ?? [];
  const mana = hud?.mana ?? 0;
  const doubled = (hud?.tick ?? 0) >= DOUBLE_MANA_TICK;
  const manaMult = driver.game.manaMult ?? 1;
  const inJericho = (hud?.tick ?? 0) >= MATCH_TICKS && !!driver.game.jericho;
  const nextCard = ARENA_CARD_BY_KEY.get(hud?.next ?? "");
  return (
    <div className="fixed inset-0 z-[70] select-none bg-[#10201a]">
      <div className="mx-auto flex h-full w-full max-w-[480px] flex-col bg-[#4d8f3a]">
        <div ref={areaRef} className="relative min-h-0 flex-1 overflow-hidden">
          <canvas ref={canvasRef} onPointerDown={onCanvasPointer} className="absolute left-0 top-0 touch-none" />
          {jerichoKey > 0 ? (
            <div key={jerichoKey} className="arena-jericho pointer-events-none absolute inset-x-0 top-1/3 z-40 flex flex-col items-center gap-1">
              <span className="rounded-2xl bg-gradient-to-b from-yellow-200 to-amber-500 px-6 py-2 text-4xl font-black uppercase tracking-wide text-amber-950 shadow-2xl ring-4 ring-white [text-shadow:0_2px_0_rgba(255,255,255,0.6)]">Jericó!</span>
              <span className="rounded-full bg-black/75 px-4 py-1 text-sm font-black text-yellow-200">A próxima torre derrubada vence!</span>
              <style>{`.arena-jericho{animation:arenaJericho 3.2s ease-out forwards}@keyframes arenaJericho{0%{opacity:0;transform:scale(.4)}12%{opacity:1;transform:scale(1.15)}22%{transform:scale(1)}80%{opacity:1}100%{opacity:0;transform:scale(1.05)}}`}</style>
            </div>
          ) : null}
          {comboMsg ? (
            <div key={comboMsg.n} className="arena-combo pointer-events-none absolute inset-x-0 top-16 z-30 flex justify-center">
              <span className={`rounded-full px-4 py-1.5 text-sm font-black shadow-lg ring-2 ${comboMsg.mine ? "bg-amber-300 text-amber-950 ring-white" : "bg-rose-600 text-white ring-rose-200"}`}><AT>
                ✨ </AT>{comboMsg.mine ? "Combo" : "Combo do adversário"}: {comboMsg.combo.label} · {comboMsg.combo.effect}
              </span>
              <style>{`.arena-combo{animation:arenaCombo 2.6s ease-out forwards}@keyframes arenaCombo{0%{opacity:0;transform:translateY(-8px)}12%{opacity:1;transform:none}80%{opacity:1}100%{opacity:0}}`}</style>
            </div>
          ) : null}
          {blindKey > 0 ? (
            <div key={blindKey} className="arena-blind pointer-events-none absolute inset-0 z-40 flex items-center justify-center bg-white">
              <span className="text-6xl" aria-hidden><AT>✨</AT></span>
              <style>{`.arena-blind{animation:arenaBlind 1.5s ease-out forwards}@keyframes arenaBlind{0%{opacity:0}8%{opacity:1}70%{opacity:1}100%{opacity:0}}`}</style>
            </div>
          ) : null}
          <div className="pointer-events-none absolute left-2 top-2 flex items-center gap-2">
            <div className="flex h-11 w-11 items-center justify-center rounded-lg border-2 border-amber-300 bg-gradient-to-b from-rose-700 to-rose-950 text-2xl shadow-lg"><AT>🛡️</AT></div>
            <div className="rounded-lg bg-black/65 px-2.5 py-1 leading-tight ring-1 ring-white/25">
              <p className="max-w-[170px] truncate text-base font-black text-white">{d.opponentLabel}</p>
              <p className="text-xs font-bold text-amber-200">{d.campaign?.name ?? ARENAS[d.arena]?.name ?? "Arena dos Heróis"}</p>
            </div>
          </div>
          <div className="pointer-events-none absolute right-2 top-2 rounded-lg border-2 border-white/40 bg-black/75 px-3 py-1 text-right shadow-lg">
            <p className={`text-xs font-black ${inJericho ? "text-yellow-300" : doubled || manaMult > 1 ? "text-amber-300" : "text-white"}`}>{inJericho ? "JERICÓ!" : manaMult > 1 ? (doubled ? "Maná x4!" : "Maná Duplo!") : doubled ? "Maná em dobro!" : "Tempo:"}</p>
            <p className="text-2xl font-black leading-none tabular-nums text-white">{fmtTime(hud?.tick ?? 0)}</p>
          </div>
          <div className="pointer-events-none absolute right-1 top-1/2 flex -translate-y-1/2 flex-col gap-4">
            <CrownCount n={hud?.theirs ?? 0} color="red" />
            <CrownCount n={hud?.mine ?? 0} color="blue" />
          </div>
          <button
            type="button"
            aria-label={muted ? "Ligar o som" : "Desligar o som"}
            onClick={() => {
              const m = !muted;
              setMuted(m);
              const snd = soundRef.current;
              if (snd) {
                snd.setMuted(m);
                snd.unlock();
              }
            }}
            className="absolute left-2 top-16 flex h-9 w-9 items-center justify-center rounded-full border-2 border-black/60 bg-black/55 text-lg"
          >
            {muted ? <AT>{"🔇"}</AT> : <AT>{"🔊"}</AT>}
          </button>
          {waiting ? (
            <div className="pointer-events-none absolute inset-x-0 top-20 flex justify-center">
              <p className="rounded-full bg-black/70 px-4 py-1.5 text-sm font-black text-white"><AT>⏳ Sincronizando com </AT>{d.opponentLabel}…</p>
            </div>
          ) : null}
          {extra}
        </div>

        <div className="border-t-4 border-[#7db4ff] bg-gradient-to-b from-[#2e72cc] to-[#1c4c9c] px-2 pb-2 pt-3">
          <div className="flex items-end gap-2">
            <div className="flex w-14 shrink-0 flex-col items-center gap-1">
              <button
                type="button"
                onClick={onLeave}
                aria-label="Desistir"
                className="flex h-10 w-10 items-center justify-center rounded-lg border-2 border-[#5a1010] bg-gradient-to-b from-red-500 to-red-700 text-xl font-black text-white shadow active:scale-95"
              ><AT>
                ✕
              </AT></button>
              <p className="text-[11px] font-black text-white">Próxima:</p>
              <div className="flex h-12 w-11 items-center justify-center rounded-lg border-2 border-[#0f2f6b] bg-gradient-to-b from-[#4a90e2] to-[#2d62b8]">
                {nextCard ? nextCard.art ? <CardArt card={nextCard} className="h-10" /> : <span className="text-xl" aria-hidden><AT>{nextCard.emoji}</AT></span> : null}
              </div>
            </div>
            <div className="grid flex-1 grid-cols-4 gap-1.5 pb-3">
              {slots.map((key, i) => {
                const c = ARENA_CARD_BY_KEY.get(key);
                if (!c) return <div key={i} />;
                const pending = d.isPending(i);
                const can = mana + 1e-9 >= c.cost && !pending;
                const isSel = selected === i;
                return (
                  <button
                    key={`${i}-${key}`}
                    type="button"
                    onClick={() => {
                      const snd = soundRef.current;
                      snd?.unlock();
                      if (pending) return;
                      if (mana + 1e-9 < c.cost) snd?.deny();
                      else snd?.select();
                      setSelected(isSel ? null : i);
                    }}
                    className={`arena-card-in relative aspect-[3/4] rounded-xl border-[3px] bg-gradient-to-b from-[#4a90e2] to-[#2d62b8] p-1 shadow-md transition active:scale-95 ${
                      isSel ? "-translate-y-3 border-amber-300 shadow-[0_0_16px_#fcd34d]" : "border-[#0f2f6b]"
                    } ${can ? "" : "brightness-50"}`}
                  >
                    <span className="flex h-full items-center justify-center pb-2">
                      {c.art ? <CardArt card={c} className="h-full max-h-[72px]" /> : <span className="text-3xl" aria-hidden><AT>{c.emoji}</AT></span>}
                    </span>
                    <span className="absolute -bottom-3 left-1/2 -translate-x-1/2">
                      <ManaBread n={c.cost} size={26} />
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mt-1 flex items-center gap-2">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center">
              <ManaBread n={Math.floor(mana)} size={32} />
            </div>
            <div className="relative h-5 flex-1 overflow-hidden rounded-full border-2 border-white/70 bg-[#1a1006] shadow-[0_0_0_1px_rgba(0,0,0,0.6)]">
              <div
                className="h-full bg-gradient-to-b from-yellow-200 via-amber-400 to-amber-600 transition-[width] duration-200 ease-linear"
                style={{ width: `${(Math.min(MANA_MAX, mana) / MANA_MAX) * 100}%` }}
              />
              {Array.from({ length: MANA_MAX - 1 }).map((_, i) => (
                <span key={i} className="absolute top-0 h-full w-px bg-black/40" style={{ left: `${((i + 1) / MANA_MAX) * 100}%` }} />
              ))}
            </div>
            <span className="w-12 text-right text-[11px] font-black text-white">Máx: {MANA_MAX}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Jericó: a arena brilha (dourado pulsando, raios de luz e estrelinhas). */
function drawJericho(ctx: CanvasRenderingContext2D, cw: number, ch: number, s: number, t: number) {
  ctx.save();
  const pulse = 0.5 + 0.5 * Math.sin(t * 0.12);
  // névoa dourada
  ctx.globalCompositeOperation = "lighter";
  const g = ctx.createRadialGradient(cw / 2, ch / 2, ch * 0.05, cw / 2, ch / 2, ch * 0.75);
  g.addColorStop(0, `rgba(255,214,90,${0.1 + pulse * 0.1})`);
  g.addColorStop(1, `rgba(255,170,30,${0.2 + pulse * 0.12})`);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, cw, ch);
  // raios que giram devagar
  ctx.translate(cw / 2, ch / 2);
  ctx.rotate(t * 0.004);
  for (let i = 0; i < 12; i++) {
    ctx.rotate((Math.PI * 2) / 12);
    const rg = ctx.createLinearGradient(0, 0, ch * 0.8, 0);
    rg.addColorStop(0, "rgba(255,230,140,0.16)");
    rg.addColorStop(1, "rgba(255,230,140,0)");
    ctx.fillStyle = rg;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(ch * 0.8, -s * 0.9);
    ctx.lineTo(ch * 0.8, s * 0.9);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
  // estrelinhas que piscam
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  for (let i = 0; i < 46; i++) {
    const x = ((i * 97) % 101) / 101 * cw;
    const y = ((i * 53 + 17) % 103) / 103 * ch;
    const tw = Math.max(0, Math.sin(t * 0.09 + i * 1.7));
    if (tw < 0.2) continue;
    const r = s * (0.08 + tw * 0.16);
    ctx.fillStyle = `rgba(255,244,190,${tw * 0.9})`;
    ctx.beginPath();
    ctx.moveTo(x, y - r * 2);
    ctx.lineTo(x + r * 0.5, y - r * 0.5);
    ctx.lineTo(x + r * 2, y);
    ctx.lineTo(x + r * 0.5, y + r * 0.5);
    ctx.lineTo(x, y + r * 2);
    ctx.lineTo(x - r * 0.5, y + r * 0.5);
    ctx.lineTo(x - r * 2, y);
    ctx.lineTo(x - r * 0.5, y - r * 0.5);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

/** Evento do motor visto de cabeça pra baixo (2º jogador). */
function mapEvent(e: GameEvent, vs: (s: Side) => Side): GameEvent {
  const fx = (x: number) => W - x;
  const fy = (y: number) => H - y;
  switch (e.t) {
    case "attack":
      return { ...e, x1: fx(e.x1), y1: fy(e.y1), x2: fx(e.x2), y2: fy(e.y2), side: vs(e.side) };
    case "hit":
      return { ...e, x: fx(e.x), y: fy(e.y), side: vs(e.side) };
    case "heal":
      return { ...e, x: fx(e.x), y: fy(e.y) };
    case "spell":
      return { ...e, x: fx(e.x), y: fy(e.y) };
    case "death":
      return { ...e, x: fx(e.x), y: fy(e.y), side: vs(e.side) };
    case "spawn":
      return { ...e, x: fx(e.x), y: fy(e.y) };
    case "blind":
      return { ...e, side: vs(e.side) };
    case "dodge":
      return { ...e, x: fx(e.x), y: fy(e.y) };
    case "jericho":
      return e;
  }
}
