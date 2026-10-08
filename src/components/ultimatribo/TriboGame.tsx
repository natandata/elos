"use client";

import { useEffect, useRef, useState } from "react";
import { Sfx } from "@/lib/ultimatribo/audio";
import { CONSUMABLES, WEAPONS } from "@/lib/ultimatribo/data/items";
import { LORE_BY_ID, LORE_ICON, type Lore } from "@/lib/ultimatribo/data/lore";
import { Renderer } from "@/lib/ultimatribo/render";
import { Game, emptyInput, type GameOptions, type MatchStats } from "@/lib/ultimatribo/sim";
import { HALF, ZONES } from "@/lib/ultimatribo/world";

type GunHud = { id: string; mag: number; reserve: number } | null;
type Hud = {
  where: "plane" | "fall" | "ground";
  hp: number;
  boost: number;
  hunger: number;
  thirst: number;
  energy: number;
  vest: number;
  vestK: number;
  helmet: number;
  pack: number;
  alive: number;
  kills: number;
  zone: string;
  darkIn: number;
  darkMoving: boolean;
  inDark: boolean;
  active: 0 | 1 | 2;
  melee: string;
  guns: [GunHud, GunHud];
  grenades: number;
  med: number;
  boostN: number;
  food: number;
  drink: number;
  carried: number;
  capacity: number;
  prompt: string | null;
  using: { name: string; k: number } | null;
  reloading: boolean;
  stance: 0 | 1 | 2;
  ads: boolean;
  zoom: number;
  spread: number;
  auto: boolean;
  ranged: boolean;
  tribe: { name: string; hp: number }[];
  alt: number;
  chute: boolean;
};

type FeedLine = { id: number; text: string; tone: string };
type UiCmd = { fire: boolean; ads: boolean; interact: boolean; jump: boolean; crouch: boolean; prone: boolean; reload: boolean; grenade: boolean; slot: 0 | 1 | 2 | null; use: "food" | "drink" | "med" | "boost" | null; sprint: boolean; mx: number; mz: number };

const clock = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
const TONE: Record<string, string> = { info: "text-white", good: "text-emerald-300", bad: "text-rose-300", kill: "text-amber-300" };
const ZONE_COLOR: Record<string, string> = { cidade: "#77777a", floresta: "#4f6a36", rodovia: "#3a3a3e", fazenda: "#a08a55", igreja: "#8fa85a", fabrica: "#8a8780", acampamento: "#a08052" };
const STANCE = ["🧍", "🧎", "🛌"];

function SlotRow({ slot, id, ammo, label, on, onPick }: { slot: 0 | 1 | 2; id: string; ammo: string; label: string; on: boolean; onPick: (s: 0 | 1 | 2) => void }) {
  return (
    <button type="button" onClick={() => onPick(slot)} className={`flex w-full items-center justify-end gap-1.5 rounded px-1.5 py-0.5 text-right ${on ? "bg-white/25 text-white" : "text-white/70"}`}>
      <span className="truncate text-[10px] font-bold uppercase">{WEAPONS[id].name}</span>
      {ammo ? <span className="text-[10px] font-black tabular-nums text-amber-200">{ammo}</span> : null}
      <span className="grid h-4 w-4 place-items-center rounded-sm bg-black/60 text-[9px] font-black">{label}</span>
    </button>
  );
}

/** Uma partida de Sobrevivência: canvas 3D, controles e HUD. Chama `onEnd` quando acaba. */
export function TriboGame({ seed, name, color, options, onEnd, onQuit }: { seed: number; name: string; color: number; options: GameOptions; onEnd: (s: MatchStats) => void; onQuit: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mapRef = useRef<HTMLCanvasElement>(null);
  const compassRef = useRef<HTMLCanvasElement>(null);
  const [hud, setHud] = useState<Hud | null>(null);
  const [feed, setFeed] = useState<FeedLine[]>([]);
  const [toast, setToast] = useState<string | null>(null);
  const [lore, setLore] = useState<Lore | null>(null);
  const [hitMark, setHitMark] = useState<{ id: number; head: boolean } | null>(null);
  const [hurtFrom, setHurtFrom] = useState<{ id: number; ang: number } | null>(null);
  const [end, setEnd] = useState<MatchStats | null>(null);
  // o componente só existe no navegador (dynamic, sem SSR)
  const [touch] = useState(() => matchMedia("(pointer: coarse)").matches);
  const [portrait, setPortrait] = useState(() => innerHeight > innerWidth);
  const [locked, setLocked] = useState(false);
  const [stick, setStick] = useState<{ x: number; y: number; dx: number; dy: number } | null>(null);
  // comandos de toque e de botão da tela (lidos pelo laço do jogo)
  const ui = useRef<UiCmd>({ fire: false, ads: false, interact: false, jump: false, crouch: false, prone: false, reload: false, grenade: false, slot: null, use: null, sprint: false, mx: 0, mz: 0 });
  const endRef = useRef(onEnd);
  // celular em pé: a partida fica parada até girar a tela
  const pauseRef = useRef(false);
  useEffect(() => {
    endRef.current = onEnd;
  }, [onEnd]);
  useEffect(() => {
    pauseRef.current = touch && portrait;
  }, [touch, portrait]);

  useEffect(() => {
    const canvas = canvasRef.current!;
    const game = new Game(seed, name, color, options);
    const view = new Renderer(canvas, game);
    // só no ambiente de desenvolvimento: deixa a partida à mão para testes pelo console
    if (process.env.NODE_ENV !== "production") (window as unknown as { __ut?: Game }).__ut = game;
    const sfx = new Sfx();
    const isTouch = matchMedia("(pointer: coarse)").matches;
    let yaw = game.player.yaw;
    let pitch = 0.5;
    const keys = new Set<string>();
    let mouseFire = false;
    let mouseAds = false;
    let raf = 0;
    let last = performance.now();
    let hudT = 0;
    let mapT = 0;
    let uid = 0;
    let ended = false;
    let wasGround = false;
    let toastTimer: ReturnType<typeof setTimeout> | undefined;
    let loreTimer: ReturnType<typeof setTimeout> | undefined;
    let endTimer: ReturnType<typeof setTimeout> | undefined;
    const edge = { interact: false, jump: false, crouch: false, prone: false, reload: false, grenade: false, slot: null as 0 | 1 | 2 | null, use: null as UiCmd["use"] };

    const onKey = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (e.type === "keydown") {
        if (k === "tab" || [" ", "arrowup", "arrowdown", "arrowleft", "arrowright"].includes(k)) e.preventDefault();
        if (keys.has(k)) return;
        keys.add(k);
        if (k === "f" || k === "e") edge.interact = true;
        if (k === " ") edge.jump = true;
        if (k === "c") edge.crouch = true;
        if (k === "z") edge.prone = true;
        if (k === "r") edge.reload = true;
        if (k === "g" || k === "4") edge.grenade = true;
        if (k === "1") edge.slot = 1;
        if (k === "2") edge.slot = 2;
        if (k === "3" || k === "x") edge.slot = 0;
        if (k === "5") edge.use = "med";
        if (k === "6") edge.use = "boost";
        if (k === "7") edge.use = "food";
        if (k === "8") edge.use = "drink";
      } else keys.delete(k);
    };
    const onMouseMove = (e: MouseEvent) => {
      if (document.pointerLockElement !== canvas) return;
      const sens = game.player.ads ? 0.0026 / Math.max(1, game.weaponOf(game.player).zoom * 0.7) : 0.0026;
      yaw -= e.movementX * sens;
      pitch = Math.max(-0.35, Math.min(1.2, pitch + e.movementY * sens * 0.8));
    };
    const onMouseDown = (e: MouseEvent) => {
      sfx.unlock();
      if (isTouch) return;
      if (document.pointerLockElement !== canvas) return void canvas.requestPointerLock?.();
      if (e.button === 0) mouseFire = true;
      if (e.button === 2) mouseAds = true;
    };
    const onMouseUp = (e: MouseEvent) => {
      if (e.button === 0) mouseFire = false;
      if (e.button === 2) mouseAds = false;
    };
    const onContext = (e: Event) => e.preventDefault();
    const onLock = () => setLocked(document.pointerLockElement === canvas);
    const onBlur = () => {
      keys.clear();
      mouseFire = mouseAds = false;
    };

    // ---- toque: metade esquerda anda (alavanca), o resto olha
    let moveId = -1;
    let lookId = -1;
    let mox = 0;
    let moy = 0;
    let lx = 0;
    let ly = 0;
    const onTouchStart = (e: TouchEvent) => {
      sfx.unlock();
      for (const t of Array.from(e.changedTouches)) {
        if (t.clientX < innerWidth * 0.4 && moveId < 0) {
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
          const max = 50;
          ui.current.sprint = d > max * 1.35;
          if (d > max) {
            dx = (dx / d) * max;
            dy = (dy / d) * max;
          }
          ui.current.mx = dx / max;
          ui.current.mz = -dy / max;
          setStick({ x: mox, y: moy, dx, dy });
        } else if (t.identifier === lookId) {
          const z = game.player.ads ? Math.max(1, game.weaponOf(game.player).zoom * 0.7) : 1;
          yaw -= ((t.clientX - lx) * 0.0055) / z;
          pitch = Math.max(-0.35, Math.min(1.2, pitch + ((t.clientY - ly) * 0.004) / z));
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

    const drawCompass = () => {
      const cv = compassRef.current;
      if (!cv) return;
      const c = cv.getContext("2d")!;
      const W = cv.width;
      const H = cv.height;
      c.clearRect(0, 0, W, H);
      // norte = alto do minimapa (-Z); leste = +X
      const bearing = ((Math.atan2(Math.sin(yaw), -Math.cos(yaw)) * 180) / Math.PI + 360) % 360;
      const names: Record<number, string> = { 0: "N", 45: "NE", 90: "L", 135: "SE", 180: "S", 225: "SO", 270: "O", 315: "NO" };
      c.textAlign = "center";
      c.fillStyle = "rgba(255,255,255,0.92)";
      c.strokeStyle = "rgba(255,255,255,0.8)";
      for (let d = -75; d <= 75; d++) {
        const deg = Math.round(bearing) + d;
        const norm = ((deg % 360) + 360) % 360;
        if (norm % 15 !== 0) continue;
        const x = W / 2 + (deg - bearing) * (W / 150);
        const big = norm % 45 === 0;
        c.globalAlpha = 1 - Math.abs(deg - bearing) / 85;
        c.beginPath();
        c.moveTo(x, 2);
        c.lineTo(x, big ? 9 : 6);
        c.stroke();
        c.font = big ? "800 13px system-ui" : "600 10px system-ui";
        c.fillText(names[norm] ?? String(norm), x, 23);
      }
      c.globalAlpha = 1;
      c.fillStyle = "#ffe27a";
      c.beginPath();
      c.moveTo(W / 2, 12);
      c.lineTo(W / 2 - 4, 4);
      c.lineTo(W / 2 + 4, 4);
      c.fill();
    };

    const drawMap = () => {
      const cv = mapRef.current;
      if (!cv) return;
      const c = cv.getContext("2d")!;
      const S = cv.width;
      const k = S / (HALF * 2);
      const px = (v: number) => (v + HALF) * k;
      c.fillStyle = "#7f8c3e";
      c.fillRect(0, 0, S, S);
      for (const z of ZONES) {
        c.fillStyle = ZONE_COLOR[z.key] ?? "#666";
        c.fillRect(px(z.x0), px(z.z0), (z.x1 - z.x0) * k, (z.z1 - z.z0) * k);
      }
      const d = game.dark;
      // fora da área segura: azul, como a zona
      c.save();
      c.fillStyle = "rgba(40,90,230,0.45)";
      c.beginPath();
      c.rect(0, 0, S, S);
      c.arc(px(d.x), px(d.z), Math.max(0, d.r * k), 0, 6.3, true);
      c.fill("evenodd");
      c.restore();
      c.strokeStyle = "#5a9bff";
      c.lineWidth = 1.5;
      c.beginPath();
      c.arc(px(d.x), px(d.z), Math.max(0.5, d.r * k), 0, 6.3);
      c.stroke();
      c.strokeStyle = "#ffffff";
      c.beginPath();
      c.arc(px(d.tx), px(d.tz), Math.max(0.5, d.tr * k), 0, 6.3);
      c.stroke();
      const pl = game.plane;
      if (pl.active) {
        c.strokeStyle = "rgba(255,255,255,0.7)";
        c.setLineDash([4, 3]);
        c.beginPath();
        c.moveTo(px(pl.x0), px(pl.z0));
        c.lineTo(px(pl.x1), px(pl.z1));
        c.stroke();
        c.setLineDash([]);
        c.fillStyle = "#ffffff";
        c.font = "12px system-ui";
        c.fillText("✈", px(pl.x) - 6, px(pl.z) + 4);
      }
      for (const box of game.world.containers)
        if (box.kind === "airdrop" && !box.opened) {
          c.fillStyle = "#ff4a3a";
          c.fillRect(px(box.x) - 3, px(box.z) - 3, 6, 6);
        }
      const p = game.player;
      for (const a of game.actors) {
        if (!a.alive || a === p || a.where === "plane") continue;
        const ally = game.allies(a, p);
        if (!ally && !(p.gear.radio && Math.hypot(a.x - p.x, a.z - p.z) < 90)) continue;
        c.fillStyle = ally ? "#7de0ff" : "#ff5a5a";
        c.beginPath();
        c.arc(px(a.x), px(a.z), 2.6, 0, 6.3);
        c.fill();
      }
      c.save();
      c.translate(px(p.x), px(p.z));
      c.rotate(-yaw);
      c.fillStyle = "#ffe27a";
      c.strokeStyle = "#000";
      c.lineWidth = 1;
      c.beginPath();
      c.moveTo(0, 6);
      c.lineTo(4, -4);
      c.lineTo(-4, -4);
      c.closePath();
      c.fill();
      c.stroke();
      c.restore();
    };

    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      const dt = Math.max(0, Math.min(0.05, (now - last) / 1000));
      last = now;
      if (document.hidden || pauseRef.current) return;
      const inp = emptyInput();
      const u = ui.current;
      inp.mz = (keys.has("w") || keys.has("arrowup") ? 1 : 0) - (keys.has("s") || keys.has("arrowdown") ? 1 : 0) + u.mz;
      inp.mx = (keys.has("d") ? 1 : 0) - (keys.has("a") ? 1 : 0) + u.mx;
      // setas para os lados giram a câmera (para quem joga só no teclado)
      yaw += ((keys.has("arrowleft") ? 1 : 0) - (keys.has("arrowright") ? 1 : 0)) * dt * 2.4;
      inp.sprint = keys.has("shift") || u.sprint;
      inp.fire = mouseFire || u.fire || keys.has("enter");
      inp.ads = mouseAds || u.ads || keys.has("q");
      inp.assist = isTouch ? 0.3 : 0.04;
      inp.yaw = yaw;
      inp.interact = edge.interact || u.interact;
      inp.jump = edge.jump || u.jump;
      inp.crouch = edge.crouch || u.crouch;
      inp.prone = edge.prone || u.prone;
      inp.reload = edge.reload || u.reload;
      inp.grenade = edge.grenade || u.grenade;
      inp.slot = edge.slot ?? u.slot;
      inp.use = edge.use ?? u.use;
      edge.interact = edge.jump = edge.crouch = edge.prone = edge.reload = edge.grenade = false;
      edge.slot = edge.use = null;
      u.interact = u.jump = u.crouch = u.prone = u.reload = u.grenade = false;
      u.slot = u.use = null;

      game.update(dt, inp);
      const p = game.player;
      // a mira assistida gira o personagem: a câmera acompanha
      if (inp.fire && isTouch && p.alive && p.where === "ground") yaw = p.yaw;
      // ao pousar, a câmera volta para a altura do ombro
      if (p.where === "ground" && !wasGround) {
        wasGround = true;
        pitch = 0.14;
      }

      for (const e of game.ev) {
        if (e.t === "shot") {
          const d = Math.hypot(e.x0 - p.x, e.z0 - p.z);
          const k = e.weapon === "fuzil" || e.weapon === "submetralhadora" ? "pistola" : e.weapon;
          sfx.play(k as "pistola", 1 - d / 120);
          if (e.id === p.id) {
            // coice: a mira sobe e treme um pouco para os lados
            const rc = WEAPONS[e.weapon]?.recoil ?? 0.01;
            pitch = Math.max(-0.35, pitch - rc * (p.ads ? 0.55 : 0.9) * (p.stance ? 0.7 : 1));
            yaw += (Math.random() - 0.5) * rc * 0.5;
          }
        } else if (e.t === "melee") sfx.play("melee", 1 - Math.hypot(game.actors[e.id].x - p.x, game.actors[e.id].z - p.z) / 30);
        else if (e.t === "hit") {
          sfx.play("hit", 1 - Math.hypot(e.x - p.x, e.z - p.z) / 40);
          if (e.by === p.id && e.id !== p.id) setHitMark({ id: uid++, head: e.head });
          if (e.id === p.id && e.by !== p.id && e.by >= 0) {
            const a = game.actors[e.by];
            // direção de quem atirou, em relação ao que o jogador vê
            const world = Math.atan2(a.x - p.x, a.z - p.z);
            setHurtFrom({ id: uid++, ang: yaw - world });
          }
        } else if (e.t === "boom") sfx.play("espingarda", 1.4 - Math.hypot(e.x - p.x, e.z - p.z) / 90);
        else if (e.t === "death") sfx.play("death", e.id === p.id ? 1 : 0.4);
        else if (e.t === "dark") sfx.play("dark");
        else if (e.t === "feed") {
          const line = { id: uid++, text: e.text, tone: e.tone };
          if (e.tone === "good") sfx.play("ally");
          setFeed((f) => [...f.slice(-4), line]);
          setTimeout(() => setFeed((f) => f.filter((x) => x.id !== line.id)), 6500);
        } else if (e.t === "toast") {
          sfx.play("pickup");
          setToast(e.text);
          clearTimeout(toastTimer);
          toastTimer = setTimeout(() => setToast(null), 2800);
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
        hudT = 0.1;
        const gun = (i: 0 | 1): GunHud => {
          const g = p.guns[i];
          if (!g) return null;
          const wp = WEAPONS[g.id];
          return { id: g.id, mag: g.mag, reserve: wp.ammo ? p.ammo[wp.ammo] : 0 };
        };
        const wp = game.weaponOf(p);
        const vestMax = p.gear.colete ? [0, 100, 150, 200][p.gear.colete] : 1;
        setHud({
          where: p.where,
          hp: p.hp,
          boost: p.boost,
          hunger: p.hunger,
          thirst: p.thirst,
          energy: p.energy,
          vest: p.gear.colete,
          vestK: p.vestHp / vestMax,
          helmet: p.gear.capacete,
          pack: p.gear.mochila,
          alive: game.alive,
          kills: p.kills,
          zone: game.zoneName(),
          darkIn: game.darkCountdown(),
          darkMoving: game.dark.shrinking,
          inDark: p.where === "ground" && game.inDark(p.x, p.z),
          active: p.active,
          melee: p.melee,
          guns: [gun(0), gun(1)],
          grenades: p.grenades,
          med: game.countGroup(p, "med"),
          boostN: game.countGroup(p, "boost"),
          food: game.countGroup(p, "food"),
          drink: game.countGroup(p, "drink"),
          carried: game.carried(p),
          capacity: game.capacity(p),
          prompt: game.prompt?.text ?? null,
          using: p.using ? { name: CONSUMABLES[p.using.id].name, k: p.using.t / p.using.total } : null,
          reloading: p.reloading > 0,
          stance: p.stance,
          ads: p.ads,
          zoom: wp.zoom,
          spread: game.spreadOf(p),
          auto: wp.auto,
          ranged: wp.kind !== "melee",
          tribe: game.actors.filter((a) => a.alive && a !== p && game.allies(a, p)).map((a) => ({ name: a.name, hp: a.hp })),
          alt: p.y,
          chute: p.chute,
        });
        drawCompass();
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
        setEnd(stats);
        endTimer = setTimeout(() => endRef.current(stats), 3200);
      }
    };

    const onResize = () => {
      view.resize();
      setPortrait(innerHeight > innerWidth);
    };
    addEventListener("keydown", onKey);
    addEventListener("keyup", onKey);
    addEventListener("mousemove", onMouseMove);
    addEventListener("mouseup", onMouseUp);
    addEventListener("resize", onResize);
    addEventListener("blur", onBlur);
    document.addEventListener("pointerlockchange", onLock);
    canvas.addEventListener("mousedown", onMouseDown);
    canvas.addEventListener("contextmenu", onContext);
    canvas.addEventListener("touchstart", onTouchStart, { passive: true });
    canvas.addEventListener("touchmove", onTouchMove, { passive: false });
    canvas.addEventListener("touchend", onTouchEnd);
    canvas.addEventListener("touchcancel", onTouchEnd);
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(toastTimer);
      clearTimeout(loreTimer);
      clearTimeout(endTimer);
      removeEventListener("keydown", onKey);
      removeEventListener("keyup", onKey);
      removeEventListener("mousemove", onMouseMove);
      removeEventListener("mouseup", onMouseUp);
      removeEventListener("resize", onResize);
      removeEventListener("blur", onBlur);
      document.removeEventListener("pointerlockchange", onLock);
      document.exitPointerLock?.();
      view.dispose();
    };
  }, [seed, name, color, options]);

  // celular: tela cheia e deitada (quando o navegador deixa travar a orientação)
  useEffect(() => {
    if (!touch) return;
    const go = () => {
      const el = document.documentElement as HTMLElement & { webkitRequestFullscreen?: () => void };
      const lock = () => (screen.orientation as unknown as { lock?: (o: string) => Promise<void> }).lock?.("landscape")?.catch(() => undefined);
      if (!document.fullscreenElement) (el.requestFullscreen?.() ?? Promise.resolve()).then(lock).catch(() => undefined);
      else lock();
    };
    addEventListener("touchend", go, { once: true });
    return () => {
      removeEventListener("touchend", go);
      (screen.orientation as unknown as { unlock?: () => void }).unlock?.();
      if (document.fullscreenElement) void document.exitFullscreen?.().catch(() => undefined);
    };
  }, [touch]);

  const fireOn = (e: React.SyntheticEvent) => {
    e.preventDefault();
    ui.current.fire = true;
  };
  const fireOff = (e: React.SyntheticEvent) => {
    e.preventDefault();
    ui.current.fire = false;
  };
  const toggleAds = () => {
    ui.current.ads = !ui.current.ads;
  };

  const pickSlot = (slot: 0 | 1 | 2) => {
    ui.current.slot = slot;
  };
  const slotRow = (slot: 0 | 1 | 2, id: string, ammo: string, n: number) => <SlotRow key={slot} slot={slot} id={id} ammo={ammo} label={touch ? WEAPONS[id].emoji : String(n)} on={hud?.active === slot} onPick={pickSlot} />;

  const active = hud ? (hud.active === 0 ? null : hud.guns[hud.active - 1]) : null;
  const gap = hud ? Math.min(46, 5 + hud.spread * 260) : 8;
  const scoped = !!hud && hud.ads && hud.zoom >= 3;

  return (
    <div className="fixed inset-0 z-[70] select-none overflow-hidden bg-black font-sans" style={{ touchAction: "none" }}>
      <canvas ref={canvasRef} className="block h-full w-full" />

      {/* fora da área segura: a tela fica azulada, como dentro da zona */}
      {hud?.inDark ? <div className="pointer-events-none absolute inset-0 animate-pulse" style={{ background: "radial-gradient(circle, rgba(40,90,230,0.12) 30%, rgba(30,70,220,0.55) 100%)" }} /> : null}
      {hud && hud.thirst < 20 ? <div className="pointer-events-none absolute inset-0 backdrop-blur-[1.5px]" style={{ background: "radial-gradient(circle, transparent 40%, rgba(0,0,0,0.5) 100%)" }} /> : null}
      {hud && hud.hp < 30 && hud.where === "ground" ? <div className="pointer-events-none absolute inset-0 animate-pulse" style={{ boxShadow: "inset 0 0 90px 30px rgba(190,20,20,0.5)" }} /> : null}

      {/* luneta */}
      {scoped ? (
        <div className="pointer-events-none absolute inset-0" style={{ background: "radial-gradient(circle at 50% 50%, transparent 0, transparent min(34vh, 34vw), #000 min(35vh, 35vw))" }}>
          <span className="absolute left-0 top-1/2 h-px w-full bg-black" />
          <span className="absolute left-1/2 top-0 h-full w-px bg-black" />
        </div>
      ) : null}

      {/* mira: abre com o recuo e o movimento */}
      {hud && hud.where === "ground" && !scoped ? (
        <div className="pointer-events-none absolute left-1/2 top-1/2">
          {hud.ranged ? (
            [0, 90, 180, 270].map((r) => <span key={r} className="absolute h-[2px] w-[9px] bg-white shadow-[0_0_2px_#000]" style={{ transform: `rotate(${r}deg) translateX(${gap}px)`, transformOrigin: "0 50%", left: 0, top: -1 }} />)
          ) : (
            <span className="absolute -left-[3px] -top-[3px] h-[6px] w-[6px] rounded-full border border-black/60 bg-white/90" />
          )}
        </div>
      ) : null}
      {hitMark ? (
        <div key={hitMark.id} className="ut-hit pointer-events-none absolute left-1/2 top-1/2">
          {[45, 135, 225, 315].map((r) => (
            <span key={r} className={`absolute h-[2px] w-[10px] ${hitMark.head ? "bg-red-500" : "bg-white"}`} style={{ transform: `rotate(${r}deg) translateX(7px)`, transformOrigin: "0 50%", left: 0, top: -1 }} />
          ))}
        </div>
      ) : null}
      {hurtFrom ? (
        <div key={hurtFrom.id} className="ut-hurt pointer-events-none absolute left-1/2 top-1/2 h-0 w-0" style={{ transform: `rotate(${hurtFrom.ang}rad)` }}>
          <span className="absolute -left-10 -top-[150px] h-3 w-20 rounded-[50%] bg-red-600/80 blur-[2px]" />
        </div>
      ) : null}

      {hud ? (
        <>
          {/* bússola */}
          <canvas ref={compassRef} width={340} height={28} className="pointer-events-none absolute left-1/2 top-1 h-[26px] w-[min(46vw,340px)] -translate-x-1/2 rounded bg-black/25" />

          {/* placar */}
          <div className="absolute right-2 top-1.5 flex flex-col items-end gap-1">
            <div className="flex gap-1.5">
              <p className="rounded-sm bg-black/45 px-2 py-0.5 text-xs font-black text-white">
                <span className="text-amber-300">{hud.kills}</span> MATOU
              </p>
              <p className="rounded-sm bg-black/45 px-2 py-0.5 text-xs font-black text-white">
                <span className="text-amber-300">{hud.alive}</span> VIVOS
              </p>
              <button type="button" onClick={onQuit} className="rounded-sm bg-black/45 px-2 py-0.5 text-xs font-black text-white/80">
                ✕
              </button>
            </div>
            {touch ? (
              <canvas ref={mapRef} width={150} height={150} className="aspect-square w-[min(26vh,120px)] border border-white/60 bg-black/40" />
            ) : (
              <div className="pointer-events-none max-w-[44vw] space-y-0.5 text-right">
                {feed.map((f) => (
                  <p key={f.id} className={`ml-auto w-fit rounded-sm bg-black/45 px-1.5 py-0.5 text-[10px] font-bold ${TONE[f.tone] ?? "text-white"}`}>
                    {f.text}
                  </p>
                ))}
              </div>
            )}
          </div>

          {/* estado da zona */}
          <div className="pointer-events-none absolute left-2 top-1.5">
            <p className={`w-fit rounded-sm px-2 py-0.5 text-[11px] font-black ${hud.darkMoving || hud.inDark ? "animate-pulse bg-blue-700/85 text-white" : "bg-black/45 text-sky-200"}`}>{hud.inDark ? "⚠️ Fora da área segura!" : hud.darkMoving ? "🌑 As Trevas estão fechando" : hud.darkIn > 0 ? `🌑 As Trevas fecham em ${clock(hud.darkIn)}` : "🌑 Última área"}</p>
            <p className="mt-0.5 text-[10px] font-bold text-white/85 [text-shadow:0_1px_2px_#000]">{hud.zone}</p>
            {touch ? (
              <div className="mt-1 max-w-[40vw] space-y-0.5">
                {feed.map((f) => (
                  <p key={f.id} className={`w-fit rounded-sm bg-black/45 px-1.5 py-0.5 text-[10px] font-bold ${TONE[f.tone] ?? "text-white"}`}>
                    {f.text}
                  </p>
                ))}
              </div>
            ) : null}
          </div>

          {/* tribo */}
          {hud.tribe.length ? (
            <div className="pointer-events-none absolute bottom-16 left-2 w-28 space-y-1">
              {hud.tribe.map((t, i) => (
                <div key={t.name}>
                  <p className="truncate text-[10px] font-black text-white [text-shadow:0_1px_2px_#000]">
                    <span className="mr-1 text-sky-300">{i + 2}</span>
                    {t.name}
                  </p>
                  <div className="h-1.5 overflow-hidden rounded-sm bg-black/50">
                    <div className="h-full bg-white" style={{ width: `${t.hp}%` }} />
                  </div>
                </div>
              ))}
            </div>
          ) : null}

          {hud.where === "plane" ? (
            <div className="pointer-events-none absolute inset-x-0 top-[22%] text-center">
              <p className="text-2xl font-black tracking-widest text-white [text-shadow:0_2px_6px_#000]">ESCOLHA ONDE POUSAR</p>
              <p className="text-sm font-bold text-white/90 [text-shadow:0_1px_3px_#000]">Acompanhe o avião no minimapa e pule quando quiser</p>
            </div>
          ) : hud.where === "fall" ? (
            <div className="pointer-events-none absolute inset-x-0 top-[20%] text-center">
              <p className="text-lg font-black text-white [text-shadow:0_2px_6px_#000]">
                {hud.chute ? "🪂 Paraquedas aberto" : "Queda livre"} · {Math.round(hud.alt)} m
              </p>
              <p className="text-xs font-bold text-white/90 [text-shadow:0_1px_3px_#000]">{touch ? "Use a alavanca para dirigir" : "WASD para dirigir, mouse para olhar"}</p>
            </div>
          ) : null}

          {toast ? <p className="pointer-events-none absolute bottom-[38%] left-1/2 max-w-[70%] -translate-x-1/2 rounded bg-black/65 px-3 py-1 text-center text-xs font-black text-amber-100">{toast}</p> : null}

          {hud.using ? (
            <div className="pointer-events-none absolute left-1/2 top-[60%] w-44 -translate-x-1/2 text-center">
              <p className="text-[11px] font-black text-white [text-shadow:0_1px_2px_#000]">Usando {hud.using.name}</p>
              <div className="mt-0.5 h-1.5 overflow-hidden rounded-sm bg-black/60">
                <div className="h-full bg-white" style={{ width: `${hud.using.k * 100}%` }} />
              </div>
            </div>
          ) : hud.reloading ? (
            <p className="pointer-events-none absolute left-1/2 top-[60%] -translate-x-1/2 text-[11px] font-black text-white [text-shadow:0_1px_2px_#000]">Recarregando…</p>
          ) : null}

          {/* o que dá para fazer agora */}
          {hud.prompt ? (
            <button type="button" onClick={() => (ui.current.interact = true)} className="absolute left-[58%] top-[52%] flex items-center gap-2 rounded bg-black/60 px-3 py-1.5 text-sm font-black text-white active:scale-95">
              <span className="grid h-5 w-5 place-items-center rounded-sm bg-white text-xs font-black text-black">{touch ? "👆" : "F"}</span>
              {hud.prompt}
            </button>
          ) : null}

          {/* parte de baixo: vida, energia e munição */}
          {hud.where === "ground" ? (
            <div className={`pointer-events-none absolute bottom-2 left-1/2 -translate-x-1/2 ${touch ? "w-[min(30vw,240px)]" : "w-[min(40vw,320px)]"}`}>
              <div className="mb-1 flex items-end justify-between">
                <div className="flex items-center gap-1 text-[10px] font-black text-white [text-shadow:0_1px_2px_#000]">
                  {hud.helmet ? <span>🪖{hud.helmet}</span> : null}
                  {hud.vest ? <span>🦺{hud.vest}</span> : null}
                  {hud.pack ? <span>🎒{hud.pack}</span> : null}
                  <span className="ml-1">{STANCE[hud.stance]}</span>
                </div>
                {active && !touch ? (
                  <p className="text-right text-white [text-shadow:0_1px_3px_#000]">
                    <span className="mr-2 text-[10px] font-black uppercase text-white/85">{hud.auto ? "Auto" : "Único"}</span>
                    <span className={`text-2xl font-black tabular-nums ${active.mag === 0 ? "text-red-400" : ""}`}>{active.mag}</span>
                    <span className="mx-1 text-white/60">|</span>
                    <span className="text-sm font-bold tabular-nums text-white/85">{active.reserve}</span>
                  </p>
                ) : null}
              </div>
              {/* energia do energético/analgésico, em 4 trechos */}
              <div className="mb-0.5 flex h-1 gap-0.5">
                {[20, 60, 90, 100].map((lim, i) => {
                  const lo = [0, 20, 60, 90][i];
                  return (
                    <div key={lim} className="h-full overflow-hidden bg-black/45" style={{ flex: lim - lo }}>
                      <div className="h-full bg-amber-300" style={{ width: `${Math.max(0, Math.min(1, (hud.boost - lo) / (lim - lo))) * 100}%` }} />
                    </div>
                  );
                })}
              </div>
              <div className="h-3.5 overflow-hidden rounded-sm border border-white/50 bg-black/45">
                <div className={`h-full ${hud.hp < 25 ? "animate-pulse bg-red-500" : hud.hp < 50 ? "bg-amber-300" : "bg-white"}`} style={{ width: `${hud.hp}%` }} />
              </div>
              {hud.vest ? (
                <div className="mt-0.5 h-1 overflow-hidden bg-black/45">
                  <div className="h-full bg-sky-300" style={{ width: `${hud.vestK * 100}%` }} />
                </div>
              ) : null}
              <div className="mt-1 flex justify-center gap-3 text-[9px] font-black text-white [text-shadow:0_1px_2px_#000]">
                {(
                  [
                    ["🍖", hud.hunger, "#e0913a"],
                    ["💧", hud.thirst, "#3aa0e0"],
                    ["⚡", hud.energy, "#e8d24a"],
                  ] as const
                ).map(([icon, v, col]) => (
                  <span key={icon} className={`flex items-center gap-1 ${v < 25 ? "animate-pulse" : ""}`}>
                    {icon}
                    <span className="block h-1 w-10 overflow-hidden bg-black/50">
                      <span className="block h-full" style={{ width: `${v}%`, background: col }} />
                    </span>
                  </span>
                ))}
                <span>
                  🎒 {hud.carried}/{hud.capacity}
                </span>
              </div>
            </div>
          ) : null}

          {/* cura e comida */}
          {hud.where === "ground" ? (
            <div className="absolute bottom-2 left-2 flex gap-1">
              {(
                [
                  ["med", "🩹", hud.med, "5"],
                  ["boost", "🥤", hud.boostN, "6"],
                  ["food", "🍖", hud.food, "7"],
                  ["drink", "💧", hud.drink, "8"],
                ] as const
              ).map(([k, icon, n, key]) => (
                <button key={k} type="button" disabled={!n} onClick={() => (ui.current.use = k)} className="flex min-w-[36px] flex-col items-center rounded bg-black/50 px-1 py-0.5 text-white disabled:opacity-30">
                  <span className="text-base leading-none">{icon}</span>
                  <span className="text-[9px] font-black tabular-nums">
                    {n}
                    {touch ? "" : ` [${key}]`}
                  </span>
                </button>
              ))}
            </div>
          ) : null}

          {/* minimapa e armas, à direita */}
          <div className={`absolute bottom-2 right-2 w-[min(22vh,150px)] ${touch ? "hidden" : ""}`}>
            {hud.where === "ground" ? (
              <div className="mb-1 space-y-0.5">
                {hud.guns[0] ? slotRow(1, hud.guns[0].id, `${hud.guns[0].mag}/${hud.guns[0].reserve}`, 1) : null}
                {hud.guns[1] ? slotRow(2, hud.guns[1].id, `${hud.guns[1].mag}/${hud.guns[1].reserve}`, 2) : null}
                {slotRow(0, hud.melee, "", 3)}
                {hud.grenades ? (
                  <button type="button" onClick={() => (ui.current.grenade = true)} className="flex w-full items-center justify-end gap-1.5 px-1.5 py-0.5 text-white/70">
                    <span className="text-[10px] font-bold uppercase">Granada</span>
                    <span className="text-[10px] font-black text-amber-200">{hud.grenades}</span>
                    <span className="grid h-4 w-4 place-items-center rounded-sm bg-black/60 text-[9px] font-black">4</span>
                  </button>
                ) : null}
              </div>
            ) : null}
            {touch ? null : <canvas ref={mapRef} width={150} height={150} className="aspect-square w-full border border-white/60 bg-black/40" />}
          </div>

          {/* botões de toque (tela deitada) */}
          {touch ? (
            <>
              {hud.where === "plane" || hud.where === "fall" ? null : (
                <>
                  {/* armas: acima da barra de vida, com a munição */}
                  <div className="absolute bottom-[58px] left-1/2 flex -translate-x-1/2 gap-1">
                    {hud.guns[0] ? <div className="w-[104px] rounded bg-black/40">{slotRow(1, hud.guns[0].id, `${hud.guns[0].mag}/${hud.guns[0].reserve}`, 1)}</div> : null}
                    {hud.guns[1] ? <div className="w-[104px] rounded bg-black/40">{slotRow(2, hud.guns[1].id, `${hud.guns[1].mag}/${hud.guns[1].reserve}`, 2)}</div> : null}
                    <div className="w-[78px] rounded bg-black/40">{slotRow(0, hud.melee, "", 3)}</div>
                  </div>
                  <button type="button" onTouchStart={fireOn} onTouchEnd={fireOff} onTouchCancel={fireOff} className="absolute bottom-[20%] right-[13%] grid h-[76px] w-[76px] place-items-center rounded-full border-2 border-white/70 bg-black/35 text-3xl active:bg-white/30">
                    🔫
                  </button>
                  <button type="button" onTouchStart={fireOn} onTouchEnd={fireOff} onTouchCancel={fireOff} className="absolute left-3 top-[34%] grid h-12 w-12 place-items-center rounded-full border-2 border-white/50 bg-black/30 text-xl active:bg-white/30">
                    🔫
                  </button>
                  <button type="button" onClick={toggleAds} className={`absolute bottom-[46%] right-[4%] grid h-12 w-12 place-items-center rounded-full border-2 text-xl ${hud.ads ? "border-amber-300 bg-amber-400/40" : "border-white/60 bg-black/35"}`}>
                    🔭
                  </button>
                  <button type="button" onClick={() => (ui.current.jump = true)} className="absolute bottom-[23%] right-[3%] grid h-12 w-12 place-items-center rounded-full border-2 border-white/60 bg-black/35 text-xl text-white">
                    ⤴
                  </button>
                  <button type="button" onClick={() => (ui.current.crouch = true)} className={`absolute bottom-[4%] right-[25%] grid h-11 w-11 place-items-center rounded-full border-2 text-lg ${hud.stance === 1 ? "border-amber-300 bg-amber-400/40" : "border-white/60 bg-black/35"}`}>
                    🧎
                  </button>
                  <button type="button" onClick={() => (ui.current.prone = true)} className={`absolute bottom-[3%] right-[14%] grid h-11 w-11 place-items-center rounded-full border-2 text-lg ${hud.stance === 2 ? "border-amber-300 bg-amber-400/40" : "border-white/60 bg-black/35"}`}>
                    🛌
                  </button>
                  <button type="button" onClick={() => (ui.current.reload = true)} className="absolute bottom-[32%] right-[26%] grid h-11 w-11 place-items-center rounded-full border-2 border-white/60 bg-black/35 text-lg">
                    🔄
                  </button>
                  {hud.grenades ? (
                    <button type="button" onClick={() => (ui.current.grenade = true)} className="absolute bottom-[48%] right-[15%] grid h-11 w-11 place-items-center rounded-full border-2 border-white/60 bg-black/35 text-sm font-black text-white">
                      💣{hud.grenades}
                    </button>
                  ) : null}
                </>
              )}
              {hud.where === "plane" ? (
                <button type="button" onClick={() => (ui.current.jump = true)} className="absolute bottom-[18%] left-1/2 -translate-x-1/2 rounded bg-amber-400 px-8 py-3 text-xl font-black tracking-widest text-black shadow-lg active:scale-95">
                  PULAR
                </button>
              ) : null}
            </>
          ) : !locked && !end ? (
            <p className="pointer-events-none absolute left-1/2 top-[34%] w-[min(90%,560px)] -translate-x-1/2 rounded bg-black/70 px-4 py-2 text-center text-sm font-black text-white">
              Clique na tela para jogar
              <span className="mt-1 block text-[11px] font-bold leading-relaxed text-white/75">WASD andar · Shift correr · Espaço pular · C agachar · Z deitar · clique atirar · botão direito mirar · R recarregar · F pegar/agir · 1 2 armas · 3 corpo a corpo · G granada · 5 curar · 6 energético · 7 comer · 8 beber</span>
            </p>
          ) : null}
          {stick ? (
            <div className="pointer-events-none absolute h-[100px] w-[100px] -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white/40 bg-white/10" style={{ left: stick.x, top: stick.y }}>
              <div className="absolute left-1/2 top-1/2 h-10 w-10 rounded-full bg-white/60" style={{ transform: `translate(calc(-50% + ${stick.dx}px), calc(-50% + ${stick.dy}px))` }} />
            </div>
          ) : null}
        </>
      ) : null}

      {/* narrativa encontrada */}
      {lore ? (
        <button type="button" onClick={() => setLore(null)} className="absolute left-2 top-[18%] w-[min(46%,380px)] rounded border border-amber-300/70 bg-[#1c160e]/90 p-2.5 text-left shadow-2xl">
          <p className="text-[10px] font-black uppercase tracking-widest text-amber-300">
            {LORE_ICON[lore.kind]} {lore.title}
          </p>
          <p className="mt-1 text-xs leading-snug text-amber-50">{lore.text}</p>
          {lore.ref ? <p className="mt-1 text-[11px] font-black text-amber-300">{lore.ref}</p> : null}
          <p className="mt-1 text-[9px] font-bold text-white/50">toque para fechar · fica guardado no Diário</p>
        </button>
      ) : null}

      {/* fim de partida */}
      {end ? (
        <div className="absolute inset-0 grid place-items-center bg-black/55">
          <div className="text-center">
            <p className={`text-4xl font-black tracking-wider sm:text-6xl ${end.won ? "text-amber-300" : "text-white"} [text-shadow:0_4px_12px_#000]`}>{end.won ? "VENCEDOR!" : "VOCÊ FOI ELIMINADO"}</p>
            <p className="mt-2 text-lg font-black text-white [text-shadow:0_2px_6px_#000]">{end.won ? "A última tribo é a sua." : "Melhor sorte na próxima."}</p>
            <p className="mt-3 text-3xl font-black text-white [text-shadow:0_2px_6px_#000]">
              #{end.place} <span className="text-lg text-white/70">/ {end.players}</span>
            </p>
            <p className="mt-1 text-sm font-bold text-white/85">
              {end.kills} eliminação(ões) · {end.damage} de dano
            </p>
          </div>
        </div>
      ) : null}

      {/* celular em pé: o jogo é só deitado */}
      {touch && portrait ? (
        <div className="absolute inset-0 z-10 grid place-items-center bg-black/95 p-6 text-center">
          <div>
            <p className="text-6xl">📱↻</p>
            <p className="mt-3 text-xl font-black text-white">Gire o celular</p>
            <p className="mt-1 text-sm text-white/75">A Última Tribo é jogada com a tela deitada.</p>
            <button type="button" onClick={onQuit} className="mt-5 rounded bg-white/15 px-5 py-2 text-sm font-black text-white">
              Sair
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
