"use client";

import { useEffect, useRef, useState } from "react";
import { Sfx } from "@/lib/ultimatribo/audio";
import { CONSUMABLES, WEAPONS } from "@/lib/ultimatribo/data/items";
import { LORE_BY_ID, LORE_ICON, type Lore } from "@/lib/ultimatribo/data/lore";
import { Renderer } from "@/lib/ultimatribo/render";
import { Game, emptyInput, type MatchStats } from "@/lib/ultimatribo/sim";
import { HALF, ZONES } from "@/lib/ultimatribo/world";

type Hud = {
  hp: number;
  armor: number;
  hunger: number;
  thirst: number;
  energy: number;
  alive: number;
  kills: number;
  zone: string;
  darkIn: number;
  darkMoving: boolean;
  inDark: boolean;
  lantern: boolean;
  active: 0 | 1 | 2;
  melee: string;
  guns: ({ id: string; mag: number; reserve: number } | null)[];
  food: number;
  drink: number;
  med: number;
  carried: number;
  capacity: number;
  prompt: string | null;
  using: { name: string; k: number } | null;
  reloading: boolean;
  tribe: string[];
  gear: string[];
};

type FeedLine = { id: number; text: string; tone: string };

const clock = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
const TONE: Record<string, string> = { info: "text-white", good: "text-emerald-300", bad: "text-rose-300", kill: "text-amber-300" };
const ZONE_COLOR: Record<string, string> = { cidade: "#6b6b70", floresta: "#3f5a36", rodovia: "#2f2f33", fazenda: "#8a7650", igreja: "#8fa06a", fabrica: "#7a7873", acampamento: "#9a7a4a" };

function Bar({ icon, value, color, low = 25 }: { icon: string; value: number; color: string; low?: number }) {
  return (
    <div className="flex items-center gap-1">
      <span className="w-4 text-center text-[11px] leading-none">{icon}</span>
      <div className="h-2 w-24 overflow-hidden rounded-full bg-black/60 ring-1 ring-white/20">
        <div className={`h-full rounded-full ${value < low ? "animate-pulse" : ""}`} style={{ width: `${Math.max(0, Math.min(100, value))}%`, background: color }} />
      </div>
    </div>
  );
}

/** Uma partida de Sobrevivência: canvas 3D, controles e HUD. Chama `onEnd` quando acaba. */
export function TriboGame({ seed, name, color, onEnd, onQuit }: { seed: number; name: string; color: number; onEnd: (s: MatchStats) => void; onQuit: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mapRef = useRef<HTMLCanvasElement>(null);
  const [hud, setHud] = useState<Hud | null>(null);
  const [feed, setFeed] = useState<FeedLine[]>([]);
  const [toast, setToast] = useState<string | null>(null);
  const [lore, setLore] = useState<Lore | null>(null);
  // o componente só existe no navegador (dynamic, sem SSR)
  const [touch] = useState(() => matchMedia("(pointer: coarse)").matches);
  const [locked, setLocked] = useState(false);
  const [stick, setStick] = useState<{ x: number; y: number; dx: number; dy: number } | null>(null);
  // comandos de toque e de botão da tela (lidos pelo laço do jogo)
  const ui = useRef({ fire: false, interact: false, reload: false, slot: null as 0 | 1 | 2 | null, use: null as "food" | "drink" | "med" | null, sprint: false, mx: 0, mz: 0 });
  const endRef = useRef(onEnd);
  useEffect(() => {
    endRef.current = onEnd;
  }, [onEnd]);

  useEffect(() => {
    const canvas = canvasRef.current!;
    const game = new Game(seed, name, color);
    const view = new Renderer(canvas, game);
    // só no ambiente de desenvolvimento: deixa a partida à mão para testes pelo console
    if (process.env.NODE_ENV !== "production") (window as unknown as { __ut?: Game }).__ut = game;
    const sfx = new Sfx();
    const isTouch = matchMedia("(pointer: coarse)").matches;
    let yaw = game.player.yaw;
    let pitch = 0.22;
    const keys = new Set<string>();
    let mouseFire = false;
    let raf = 0;
    let last = performance.now();
    let hudT = 0;
    let mapT = 0;
    let feedId = 0;
    let ended = false;
    let toastTimer: ReturnType<typeof setTimeout> | undefined;
    let loreTimer: ReturnType<typeof setTimeout> | undefined;
    const edge = { interact: false, reload: false, slot: null as 0 | 1 | 2 | null, use: null as "food" | "drink" | "med" | null };

    const onKey = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (e.type === "keydown") {
        if (keys.has(k)) return;
        keys.add(k);
        if (k === "e") edge.interact = true;
        if (k === "r") edge.reload = true;
        if (k === "1") edge.slot = 0;
        if (k === "2") edge.slot = 1;
        if (k === "3") edge.slot = 2;
        if (k === "z") edge.use = "food";
        if (k === "x") edge.use = "drink";
        if (k === "c") edge.use = "med";
        if ([" ", "arrowup", "arrowdown", "arrowleft", "arrowright"].includes(k)) e.preventDefault();
      } else keys.delete(k);
    };
    const onMouseMove = (e: MouseEvent) => {
      if (document.pointerLockElement !== canvas) return;
      yaw -= e.movementX * 0.0026;
      pitch = Math.max(-0.3, Math.min(0.95, pitch + e.movementY * 0.002));
    };
    const onMouseDown = (e: MouseEvent) => {
      sfx.unlock();
      if (isTouch) return;
      if (document.pointerLockElement !== canvas) return void canvas.requestPointerLock?.();
      if (e.button === 0) mouseFire = true;
    };
    const onMouseUp = () => (mouseFire = false);
    const onLock = () => setLocked(document.pointerLockElement === canvas);

    // ---- toque: metade esquerda anda (alavanca), metade direita olha
    let moveId = -1;
    let lookId = -1;
    let mox = 0;
    let moy = 0;
    let lx = 0;
    let ly = 0;
    const onTouchStart = (e: TouchEvent) => {
      sfx.unlock();
      for (const t of Array.from(e.changedTouches)) {
        if (t.clientX < innerWidth * 0.45 && moveId < 0) {
          moveId = t.identifier;
          mox = t.clientX;
          moy = t.clientY;
          setStick({ x: mox, y: moy, dx: 0, dy: 0 });
        } else if (lookId < 0) {
          lookId = t.identifier;
          lx = t.clientX;
          ly = t.clientY;
        }
      }
    };
    const onTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      for (const t of Array.from(e.changedTouches)) {
        if (t.identifier === moveId) {
          let dx = t.clientX - mox;
          let dy = t.clientY - moy;
          const d = Math.hypot(dx, dy);
          const max = 52;
          if (d > max) {
            dx = (dx / d) * max;
            dy = (dy / d) * max;
          }
          ui.current.mx = dx / max;
          ui.current.mz = -dy / max;
          ui.current.sprint = d > max * 1.5;
          setStick({ x: mox, y: moy, dx, dy });
        } else if (t.identifier === lookId) {
          yaw -= (t.clientX - lx) * 0.0058;
          pitch = Math.max(-0.3, Math.min(0.95, pitch + (t.clientY - ly) * 0.004));
          lx = t.clientX;
          ly = t.clientY;
        }
      }
    };
    const onTouchEnd = (e: TouchEvent) => {
      for (const t of Array.from(e.changedTouches)) {
        if (t.identifier === moveId) {
          moveId = -1;
          ui.current.mx = 0;
          ui.current.mz = 0;
          ui.current.sprint = false;
          setStick(null);
        } else if (t.identifier === lookId) lookId = -1;
      }
    };

    const drawMap = () => {
      const cv = mapRef.current;
      if (!cv) return;
      const c = cv.getContext("2d")!;
      const S = cv.width;
      const k = S / (HALF * 2);
      const px = (v: number) => (v + HALF) * k;
      c.fillStyle = "#586044";
      c.fillRect(0, 0, S, S);
      for (const z of ZONES) {
        c.fillStyle = ZONE_COLOR[z.key] ?? "#666";
        c.fillRect(px(z.x0), px(z.z0), (z.x1 - z.x0) * k, (z.z1 - z.z0) * k);
      }
      const d = game.dark;
      // fora da área segura fica escuro
      c.save();
      c.fillStyle = "rgba(20,8,34,0.72)";
      c.beginPath();
      c.rect(0, 0, S, S);
      c.arc(px(d.x), px(d.z), Math.max(0, d.r * k), 0, 6.3, true);
      c.fill("evenodd");
      c.restore();
      c.strokeStyle = "#ffffff";
      c.setLineDash([3, 3]);
      c.beginPath();
      c.arc(px(d.tx), px(d.tz), Math.max(0.5, d.tr * k), 0, 6.3);
      c.stroke();
      c.setLineDash([]);
      const p = game.player;
      for (const a of game.actors) {
        if (!a.alive || a === p) continue;
        const ally = game.allies(a, p);
        if (!ally && !(p.gear.radio && Math.hypot(a.x - p.x, a.z - p.z) < 90)) continue;
        c.fillStyle = ally ? "#7dffa0" : "#ff5a5a";
        c.beginPath();
        c.arc(px(a.x), px(a.z), 2.6, 0, 6.3);
        c.fill();
      }
      c.save();
      c.translate(px(p.x), px(p.z));
      c.rotate(-yaw);
      c.fillStyle = "#ffe27a";
      c.beginPath();
      c.moveTo(0, 5);
      c.lineTo(3.4, -3.4);
      c.lineTo(-3.4, -3.4);
      c.closePath();
      c.fill();
      c.restore();
    };

    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      if (document.hidden) return;
      const inp = emptyInput();
      const u = ui.current;
      inp.mz = (keys.has("w") || keys.has("arrowup") ? 1 : 0) - (keys.has("s") || keys.has("arrowdown") ? 1 : 0) + u.mz;
      inp.mx = (keys.has("d") ? 1 : 0) - (keys.has("a") ? 1 : 0) + u.mx;
      // setas para os lados giram a câmera (para quem joga só no teclado)
      yaw += ((keys.has("arrowleft") ? 1 : 0) - (keys.has("arrowright") ? 1 : 0)) * dt * 2.4;
      inp.sprint = keys.has("shift") || u.sprint;
      inp.fire = mouseFire || u.fire || keys.has(" ");
      inp.assist = isTouch ? 0.34 : 0.05;
      inp.yaw = yaw;
      inp.interact = edge.interact || u.interact;
      inp.reload = edge.reload || u.reload;
      inp.slot = edge.slot ?? u.slot;
      inp.use = edge.use ?? u.use;
      edge.interact = edge.reload = false;
      edge.slot = edge.use = null;
      u.interact = u.reload = false;
      u.slot = u.use = null;

      game.update(dt, inp);
      // a mira assistida gira o personagem: a câmera acompanha
      if (inp.fire && isTouch && game.player.alive) yaw = game.player.yaw;

      const p = game.player;
      for (const e of game.ev) {
        if (e.t === "shot") {
          const d = Math.hypot(e.x0 - p.x, e.z0 - p.z);
          sfx.play(e.weapon as "pistola", 1 - d / 110);
        } else if (e.t === "melee") sfx.play("melee", 1 - Math.hypot(game.actors[e.id].x - p.x, game.actors[e.id].z - p.z) / 30);
        else if (e.t === "hit") sfx.play("hit", 1 - Math.hypot(e.x - p.x, e.z - p.z) / 40);
        else if (e.t === "death") sfx.play("death", e.id === p.id ? 1 : 0.4);
        else if (e.t === "dark") sfx.play("dark");
        else if (e.t === "feed") {
          const line = { id: feedId++, text: e.text, tone: e.tone };
          if (e.tone === "good") sfx.play("ally");
          setFeed((f) => [...f.slice(-4), line]);
          setTimeout(() => setFeed((f) => f.filter((x) => x.id !== line.id)), 6500);
        } else if (e.t === "toast") {
          sfx.play("pickup");
          setToast(e.text);
          clearTimeout(toastTimer);
          toastTimer = setTimeout(() => setToast(null), 2600);
        } else if (e.t === "lore") {
          sfx.play("lore");
          setLore(LORE_BY_ID.get(e.id) ?? null);
          clearTimeout(loreTimer);
          loreTimer = setTimeout(() => setLore(null), 11000);
        }
      }
      view.frame(dt, yaw, pitch);
      game.ev.length = 0;

      hudT -= dt;
      if (hudT <= 0) {
        hudT = 0.12;
        const wpAmmo = (i: 0 | 1) => {
          const g = p.guns[i];
          if (!g) return null;
          const wp = WEAPONS[g.id];
          return { id: g.id, mag: g.mag, reserve: wp.ammo ? p.ammo[wp.ammo] : 0 };
        };
        setHud({
          hp: p.hp,
          armor: p.armor,
          hunger: p.hunger,
          thirst: p.thirst,
          energy: p.energy,
          alive: game.alive,
          kills: p.kills,
          zone: game.zoneName(),
          darkIn: game.darkCountdown(),
          darkMoving: game.dark.shrinking,
          inDark: game.inDark(p.x, p.z),
          lantern: !!p.gear.lanterna,
          active: p.active,
          melee: p.melee,
          guns: [wpAmmo(0), wpAmmo(1)],
          food: game.countGroup(p, "food"),
          drink: game.countGroup(p, "drink"),
          med: game.countGroup(p, "med"),
          carried: game.carried(p),
          capacity: game.capacity(p),
          prompt: game.prompt?.text ?? null,
          using: p.using ? { name: CONSUMABLES[p.using.id].name, k: p.using.t / p.using.total } : null,
          reloading: p.reloading > 0,
          tribe: game.actors.filter((a) => a.alive && a !== p && game.allies(a, p)).map((a) => a.name),
          gear: Object.keys(p.gear).filter((g) => p.gear[g]),
        });
      }
      mapT -= dt;
      if (mapT <= 0) {
        mapT = 0.2;
        drawMap();
      }
      if (game.over && !ended) {
        ended = true;
        if (game.over.won) sfx.play("win");
        document.exitPointerLock?.();
        const stats = game.over;
        setTimeout(() => endRef.current(stats), 1800);
      }
    };

    const onResize = () => view.resize();
    addEventListener("keydown", onKey);
    addEventListener("keyup", onKey);
    addEventListener("mousemove", onMouseMove);
    addEventListener("mouseup", onMouseUp);
    addEventListener("resize", onResize);
    document.addEventListener("pointerlockchange", onLock);
    canvas.addEventListener("mousedown", onMouseDown);
    canvas.addEventListener("touchstart", onTouchStart, { passive: true });
    canvas.addEventListener("touchmove", onTouchMove, { passive: false });
    canvas.addEventListener("touchend", onTouchEnd);
    canvas.addEventListener("touchcancel", onTouchEnd);
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(toastTimer);
      clearTimeout(loreTimer);
      removeEventListener("keydown", onKey);
      removeEventListener("keyup", onKey);
      removeEventListener("mousemove", onMouseMove);
      removeEventListener("mouseup", onMouseUp);
      removeEventListener("resize", onResize);
      document.removeEventListener("pointerlockchange", onLock);
      document.exitPointerLock?.();
      view.dispose();
    };
  }, [seed, name, color]);

  const fireOn = (e: React.SyntheticEvent) => {
    e.preventDefault();
    ui.current.fire = true;
  };
  const fireOff = (e: React.SyntheticEvent) => {
    e.preventDefault();
    ui.current.fire = false;
  };
  const weaponBtn = (slot: 0 | 1 | 2, id: string, ammo: string) => (
    <button key={slot} type="button" onClick={() => (ui.current.slot = slot)} className={`flex min-w-[58px] flex-col items-center rounded-lg border-2 px-2 py-1 text-white ${hud?.active === slot ? "border-amber-300 bg-amber-500/30" : "border-white/25 bg-black/55"}`}>
      <span className="text-lg leading-none">{WEAPONS[id].emoji}</span>
      <span className="text-[9px] font-black uppercase leading-tight">{WEAPONS[id].name}</span>
      <span className="text-[10px] font-bold tabular-nums text-amber-200">{ammo}</span>
    </button>
  );

  return (
    <div className="fixed inset-0 z-[70] select-none overflow-hidden bg-black" style={{ touchAction: "none" }}>
      <canvas ref={canvasRef} className="block h-full w-full" />

      {/* escuridão das Trevas e visão turva de sede */}
      {hud?.inDark ? <div className="pointer-events-none absolute inset-0" style={{ background: `radial-gradient(circle at 50% 55%, transparent ${hud.lantern ? 34 : 14}%, rgba(12,4,24,${hud.lantern ? 0.7 : 0.93}) ${hud.lantern ? 78 : 52}%)` }} /> : null}
      {hud && hud.thirst < 20 ? <div className="pointer-events-none absolute inset-0 backdrop-blur-[1.5px]" style={{ background: "radial-gradient(circle, transparent 40%, rgba(0,0,0,0.55) 100%)" }} /> : null}
      {hud && hud.hp < 30 ? <div className="pointer-events-none absolute inset-0 animate-pulse" style={{ boxShadow: "inset 0 0 90px 30px rgba(190,20,20,0.55)" }} /> : null}

      {/* mira */}
      <div className="pointer-events-none absolute left-1/2 top-1/2 h-5 w-5 -translate-x-1/2 -translate-y-1/2">
        <span className="absolute left-1/2 top-0 h-full w-[2px] -translate-x-1/2 bg-white/80 mix-blend-difference" />
        <span className="absolute left-0 top-1/2 h-[2px] w-full -translate-y-1/2 bg-white/80 mix-blend-difference" />
      </div>

      {hud ? (
        <>
          {/* corpo */}
          <div className="pointer-events-none absolute left-2 top-2 space-y-1 rounded-xl bg-black/45 p-2">
            <Bar icon="❤️" value={hud.hp} color="#e5484d" low={30} />
            {hud.armor > 0 ? <Bar icon="🦺" value={(hud.armor / 90) * 100} color="#8aa0b8" low={0} /> : null}
            <Bar icon="🍖" value={hud.hunger} color="#e0913a" />
            <Bar icon="💧" value={hud.thirst} color="#3aa0e0" />
            <Bar icon="⚡" value={hud.energy} color="#e8d24a" low={15} />
            {hud.tribe.length ? <p className="pt-0.5 text-[10px] font-black text-emerald-300">🤝 {hud.tribe.join(", ")}</p> : null}
          </div>

          {/* placar e Trevas */}
          <div className="pointer-events-none absolute left-1/2 top-2 -translate-x-1/2 text-center">
            <p className="rounded-full bg-black/55 px-3 py-0.5 text-xs font-black text-white">
              👥 {hud.alive} vivos · ☠️ {hud.kills}
            </p>
            <p className={`mt-1 rounded-full px-3 py-0.5 text-[11px] font-black ${hud.darkMoving || hud.inDark ? "animate-pulse bg-purple-900/80 text-purple-100" : "bg-black/55 text-purple-200"}`}>{hud.inDark ? "⚠️ Você está nas Trevas!" : hud.darkMoving ? "🌑 As Trevas avançam" : hud.darkIn > 0 ? `🌑 Trevas em ${clock(hud.darkIn)}` : "🌑 Última área"}</p>
            <p className="mt-1 text-[10px] font-bold text-white/70 [text-shadow:0_1px_2px_#000]">{hud.zone}</p>
          </div>

          {/* minimapa */}
          <div className="absolute right-2 top-2">
            <canvas ref={mapRef} width={132} height={132} className="h-[108px] w-[108px] rounded-lg border-2 border-white/40 bg-black/50 sm:h-[132px] sm:w-[132px]" />
            <button type="button" onClick={onQuit} className="mt-1 w-full rounded-md bg-black/55 py-0.5 text-[10px] font-black text-white/80">
              Sair
            </button>
          </div>

          {/* acontecimentos */}
          <div className="pointer-events-none absolute left-2 top-[150px] max-w-[70%] space-y-0.5">
            {feed.map((f) => (
              <p key={f.id} className={`w-fit rounded bg-black/55 px-2 py-0.5 text-[11px] font-bold ${TONE[f.tone] ?? "text-white"}`}>
                {f.text}
              </p>
            ))}
          </div>

          {toast ? <p className="pointer-events-none absolute bottom-[42%] left-1/2 max-w-[92%] -translate-x-1/2 rounded-xl bg-black/75 px-3 py-1.5 text-center text-sm font-black text-amber-100">{toast}</p> : null}

          {hud.using ? (
            <div className="pointer-events-none absolute left-1/2 top-[58%] w-40 -translate-x-1/2 text-center">
              <p className="text-[11px] font-black text-white [text-shadow:0_1px_2px_#000]">Usando {hud.using.name}...</p>
              <div className="mt-0.5 h-1.5 overflow-hidden rounded-full bg-black/60">
                <div className="h-full bg-emerald-400" style={{ width: `${hud.using.k * 100}%` }} />
              </div>
            </div>
          ) : hud.reloading ? (
            <p className="pointer-events-none absolute left-1/2 top-[58%] -translate-x-1/2 text-[11px] font-black text-white [text-shadow:0_1px_2px_#000]">Recarregando...</p>
          ) : null}

          {/* o que dá para fazer agora */}
          {hud.prompt ? (
            <button type="button" onClick={() => (ui.current.interact = true)} className="absolute bottom-[31%] left-1/2 -translate-x-1/2 rounded-full border-2 border-amber-300 bg-black/75 px-4 py-2 text-sm font-black text-amber-100 active:scale-95">
              {touch ? "👆" : "[E]"} {hud.prompt}
            </button>
          ) : null}

          {/* armas e mochila */}
          <div className="absolute bottom-2 left-1/2 flex -translate-x-1/2 items-end gap-1.5">
            {weaponBtn(0, hud.melee, touch ? "" : "1")}
            {hud.guns.map((g, i) => (g ? weaponBtn((i + 1) as 1 | 2, g.id, `${g.mag}/${g.reserve}`) : null))}
            <span className="mx-0.5" />
            {(
              [
                ["food", "🍖", hud.food, "Z"],
                ["drink", "💧", hud.drink, "X"],
                ["med", "🩹", hud.med, "C"],
              ] as const
            ).map(([k, icon, n, key]) => (
              <button key={k} type="button" disabled={!n} onClick={() => (ui.current.use = k)} className="flex min-w-[44px] flex-col items-center rounded-lg border-2 border-white/25 bg-black/55 px-1.5 py-1 text-white disabled:opacity-35">
                <span className="text-lg leading-none">{icon}</span>
                <span className="text-[10px] font-black tabular-nums">
                  {n}
                  {touch ? "" : ` · ${key}`}
                </span>
              </button>
            ))}
          </div>
          <p className="pointer-events-none absolute bottom-[68px] left-1/2 -translate-x-1/2 text-[9px] font-bold text-white/60">
            🎒 {hud.carried}/{hud.capacity} {hud.gear.includes("radio") ? "· 📻" : ""} {hud.gear.includes("lanterna") ? "· 🔦" : ""}
          </p>

          {/* botões de toque */}
          {touch ? (
            <>
              <button type="button" onTouchStart={fireOn} onTouchEnd={fireOff} onTouchCancel={fireOff} className="absolute bottom-[110px] right-4 grid h-20 w-20 place-items-center rounded-full border-4 border-rose-300/80 bg-rose-600/60 text-3xl active:bg-rose-500">
                🎯
              </button>
              <button type="button" onClick={() => (ui.current.reload = true)} className="absolute bottom-[205px] right-6 grid h-12 w-12 place-items-center rounded-full border-2 border-white/50 bg-black/55 text-xl">
                🔄
              </button>
            </>
          ) : !locked ? (
            <p className="pointer-events-none absolute left-1/2 top-[38%] -translate-x-1/2 rounded-xl bg-black/75 px-4 py-2 text-center text-sm font-black text-white">
              Clique para jogar
              <span className="mt-1 block text-[11px] font-bold text-white/70">WASD andar · mouse mirar · clique atirar · Shift correr · E agir · R recarregar · 1 2 3 armas · Z X C comer, beber, curar</span>
            </p>
          ) : null}
          {stick ? (
            <div className="pointer-events-none absolute h-[104px] w-[104px] -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white/40 bg-white/10" style={{ left: stick.x, top: stick.y }}>
              <div className="absolute left-1/2 top-1/2 h-11 w-11 rounded-full bg-white/60" style={{ transform: `translate(calc(-50% + ${stick.dx}px), calc(-50% + ${stick.dy}px))` }} />
            </div>
          ) : null}
        </>
      ) : null}

      {/* narrativa encontrada */}
      {lore ? (
        <button type="button" onClick={() => setLore(null)} className="absolute left-1/2 top-[18%] w-[min(92%,420px)] -translate-x-1/2 rounded-2xl border-2 border-amber-300/80 bg-[#1c160e]/95 p-3 text-left shadow-2xl">
          <p className="text-[10px] font-black uppercase tracking-widest text-amber-300">
            {LORE_ICON[lore.kind]} {lore.title}
          </p>
          <p className="mt-1 text-sm leading-snug text-amber-50">{lore.text}</p>
          {lore.ref ? <p className="mt-1 text-xs font-black text-amber-300">{lore.ref}</p> : null}
          <p className="mt-1 text-[9px] font-bold text-white/50">toque para fechar · fica guardado no Diário</p>
        </button>
      ) : null}
    </div>
  );
}
