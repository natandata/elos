"use client";

import { useEffect, useRef, useState } from "react";
import { newAnim } from "./arenaFx";
import { ATK_TICKS, computePose, type Pose } from "./arenaMotion";
import { drawRig, rigOf } from "./arenaRig";

// Laboratório de animação da Arena: cada herói em todos os estados (parado, andando, golpe em 3 tempos, tranco)
// e um laço ao vivo. Serve para ajustar o "feeling" sem jogar uma partida.

const HEROES = ["amandinha", "mbappe", "nery", "henrique", "tiaaline", "marcelinho", "natanrebeca", "zepa", "sansao", "davi", "daniel", "moises", "noe", "josue"];

type Frame = { label: string; pose: (card: string) => Pose; ranged?: boolean };

function poseAt(card: string, setup: (an: ReturnType<typeof newAnim>) => number, ranged = false): Pose {
  const an = newAnim(-999, 0);
  an.ranged = ranged;
  an.atkDx = 1;
  an.atkDy = 0;
  an.hitDx = 1;
  const t = setup(an);
  return computePose({ card, flying: false, id: 3, s: 40, r: 22, tickF: t, an, spawnP: 1 });
}

const FRAMES: Frame[] = [
  { label: "parado", pose: (c) => poseAt(c, () => 50) },
  { label: "passo 1", pose: (c) => poseAt(c, (an) => ((an.moving = true), (an.walk = 0.45), 50)) },
  { label: "passo 2", pose: (c) => poseAt(c, (an) => ((an.moving = true), (an.walk = 0.9), 50)) },
  { label: "passo 3", pose: (c) => poseAt(c, (an) => ((an.moving = true), (an.walk = 1.35), 50)) },
  { label: "antecipa", pose: (c) => poseAt(c, (an) => ((an.atk = 50 - 0.25 * ATK_TICKS), 50)) },
  { label: "golpe", pose: (c) => poseAt(c, (an) => ((an.atk = 50 - 0.45 * ATK_TICKS), 50)) },
  { label: "recupera", pose: (c) => poseAt(c, (an) => ((an.atk = 50 - 0.7 * ATK_TICKS), 50)) },
  { label: "tranco", pose: (c) => poseAt(c, (an) => ((an.hit = 50 - 1), 50)) },
];

const CELL = 150;

function drawHero(ctx: CanvasRenderingContext2D, img: HTMLImageElement, card: string, pose: Pose, cx: number, foot: number, tickF: number) {
  const h = 120;
  const w = (h * img.naturalWidth) / img.naturalHeight;
  ctx.fillStyle = "rgba(0,0,0,0.28)";
  ctx.beginPath();
  ctx.ellipse(cx, foot, 30, 12, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.save();
  ctx.translate(cx + pose.thrustX, foot - pose.bob + pose.thrustY);
  ctx.rotate(pose.sway);
  ctx.scale(pose.sx, pose.sy);
  if (pose.trail > 0.15) {
    ctx.globalAlpha = 0.2 * pose.trail;
    ctx.drawImage(img, -w / 2 - 26, -h * 0.97, w, h);
    ctx.globalAlpha = 0.32 * pose.trail;
    ctx.drawImage(img, -w / 2 - 13, -h * 0.97, w, h);
    ctx.globalAlpha = 1;
  }
  drawRig(ctx, img, -w / 2, -h * 0.97, w, h, { gait: pose.gait, moving: pose.moving, atk: pose.atkT, hit: pose.hitK, idle: tickF * 0.16 }, rigOf(card));
  ctx.restore();
}

export function ArenaLab({ cards = HEROES }: { cards?: string[] }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const live = useRef<HTMLCanvasElement>(null);
  const [imgs, setImgs] = useState<Record<string, HTMLImageElement>>({});
  const [sel, setSel] = useState(cards[0]);
  const [mode, setMode] = useState<"parado" | "andar" | "golpe" | "tranco">("golpe");
  const [still, setStill] = useState(-1); // -1 = ao vivo; senão, um quadro parado ampliado

  useEffect(() => {
    let alive = true;
    const out: Record<string, HTMLImageElement> = {};
    Promise.all(
      cards.map(
        (c) =>
          new Promise<void>((res) => {
            const im = new Image();
            im.onload = () => ((out[c] = im), res());
            im.onerror = () => res();
            im.src = `/arena/${c}.webp`;
          }),
      ),
    ).then(() => alive && setImgs(out));
    return () => {
      alive = false;
    };
  }, [cards]);

  // quadro a quadro de todos os heróis
  useEffect(() => {
    const cv = ref.current;
    if (!cv || !Object.keys(imgs).length) return;
    const ctx = cv.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, cv.width, cv.height);
    ctx.fillStyle = "#3d7a3d";
    ctx.fillRect(0, 0, cv.width, cv.height);
    ctx.font = "11px system-ui";
    ctx.textAlign = "center";
    cards.forEach((c, row) => {
      const im = imgs[c];
      if (!im) return;
      FRAMES.forEach((f, col) => {
        const cx = col * CELL + CELL / 2;
        const foot = row * CELL + CELL - 14;
        drawHero(ctx, im, c, f.pose(c), cx, foot, 50);
        if (row === 0) {
          ctx.fillStyle = "#fff";
          ctx.fillText(f.label, cx, 12);
        }
      });
      ctx.fillStyle = "#fff";
      ctx.textAlign = "left";
      ctx.fillText(c, 4, row * CELL + 26);
      ctx.textAlign = "center";
    });
  }, [imgs, cards]);

  // laço ao vivo do herói escolhido
  useEffect(() => {
    const cv = live.current;
    const im = imgs[sel];
    if (!cv || !im) return;
    const ctx = cv.getContext("2d");
    if (!ctx) return;
    if (still >= 0) {
      ctx.fillStyle = "#3d7a3d";
      ctx.fillRect(0, 0, cv.width, cv.height);
      ctx.save();
      ctx.translate(cv.width / 2 - 50, cv.height - 40);
      ctx.scale(2.6, 2.6);
      drawHero(ctx, im, sel, FRAMES[still].pose(sel), 0, 0, 50);
      ctx.restore();
      return;
    }
    const an = newAnim(-999, 0);
    an.atkDx = 1;
    an.atkDy = 0;
    an.hitDx = 1;
    let tick = 0;
    const id = setInterval(() => {
      tick += 1;
      an.moving = mode === "andar";
      if (an.moving) an.walk += 0.12;
      if (mode === "golpe" && tick % 24 === 0) an.atk = tick;
      if (mode === "tranco" && tick % 24 === 0) an.hit = tick;
      const p = computePose({ card: sel, flying: false, id: 3, s: 40, r: 22, tickF: tick, an, spawnP: 1 });
      ctx.fillStyle = "#3d7a3d";
      ctx.fillRect(0, 0, cv.width, cv.height);
      drawHero(ctx, im, sel, p, cv.width / 2, cv.height - 30, tick);
    }, 50);
    return () => clearInterval(id);
  }, [imgs, sel, mode, still]);

  return (
    <div className="space-y-4 p-4">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <select value={sel} onChange={(e) => setSel(e.target.value)} className="rounded-lg border border-white/20 bg-black/40 px-2 py-1">
          {cards.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
        {(["parado", "andar", "golpe", "tranco"] as const).map((m) => (
          <button key={m} onClick={() => setMode(m)} className={`rounded-full px-3 py-1 ${mode === m ? "bg-white text-black" : "bg-white/10"}`}>
            {m}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap gap-1 text-xs">
        <button onClick={() => setStill(-1)} className={`rounded-full px-2 py-1 ${still < 0 ? "bg-white text-black" : "bg-white/10"}`}>ao vivo</button>
        {FRAMES.map((f, i) => (
          <button key={f.label} onClick={() => setStill(i)} className={`rounded-full px-2 py-1 ${still === i ? "bg-white text-black" : "bg-white/10"}`}>{f.label}</button>
        ))}
      </div>
      <canvas ref={live} width={460} height={420} className="rounded-xl" />
      <div className="overflow-x-auto">
        <canvas ref={ref} width={FRAMES.length * CELL} height={cards.length * CELL} />
      </div>
    </div>
  );
}
