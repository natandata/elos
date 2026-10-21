"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { buildNew, collect, getTribos, moveBuilding, removeObstacle, speedUp, upgradeBuilding, type TribosResult } from "@/lib/actions/tribos";
import { BUILDINGS, BUILD_KINDS, GRID, MAX_TH, RES_EMOJI, TRIBES, fmtDuration, fmtNum, isBuild, isObstacle, levelDef, playerLevel, xpForLevel, type BuildKind, type Kind } from "@/lib/tribos/data";
import {
  builderCount, busyCount, canPlace, capacity, footprint, inProgress, kindEmoji, kindName, produced, quoteBuild, quoteRemove, quoteUpgrade, speedUpGems, thLevel,
  type Quote, type TBuilding, type TState,
} from "@/lib/tribos/state";
import { TH, applyCam, drawBuilding, drawFootprint, drawGround, screenToTile, sortForDraw, toWorld, type Cam } from "./render";

type Ghost = { kind: Kind; id: string | null; x: number; y: number };

function findSpot(bs: TBuilding[], kind: string, cx: number, cy: number): [number, number] {
  for (let r = 0; r < 24; r++) {
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
        const x = Math.round(cx) + dx;
        const y = Math.round(cy) + dy;
        if (canPlace(bs, kind, x, y)) return [x, y];
      }
    }
  }
  return [Math.round(cx), Math.round(cy)];
}

export function TribosVillage({ initial, demo = false }: { initial: TState; demo?: boolean }) {
  const [st, setSt] = useState<TState>(initial);
  const [nowUi, setNowUi] = useState(initial.serverNow);
  const [sel, setSel] = useState<string | null>(null);
  const [ghost, setGhost] = useState<Ghost | null>(null);
  const [shop, setShop] = useState(false);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const wrap = useRef<HTMLDivElement>(null);
  const cv = useRef<HTMLCanvasElement>(null);
  const cam = useRef<Cam>({ x: 0, y: 640, z: 0.8 });
  const size = useRef({ w: 360, h: 640, dpr: 1 });
  const offset = useRef(initial.serverNow - Date.now());
  const refs = useRef({ st: initial, sel: null as string | null, ghost: null as Ghost | null });
  const refreshing = useRef(false);
  const zoomed = useRef(false);

  const tribe = TRIBES[st.player.tribe];

  useEffect(() => {
    refs.current = { st, sel, ghost };
  }, [st, sel, ghost]);

  const applyState = useCallback((s: TState) => {
    offset.current = s.serverNow - Date.now();
    setSt(s);
    setNowUi(s.serverNow);
  }, []);

  const say = useCallback((m: string) => {
    setToast(m);
    window.setTimeout(() => setToast((x) => (x === m ? null : x)), 3200);
  }, []);

  const run = useCallback(
    async (fn: () => Promise<TribosResult>, after?: () => void) => {
      if (demo) {
        say("Modo demonstração: nada é salvo.");
        return;
      }
      setBusy(true);
      try {
        const r = await fn();
        if (r.error) say(r.error);
        else if (r.state) {
          applyState(r.state);
          if (r.note) say(r.note);
          after?.();
        }
      } catch {
        say("Sem conexão. Tente de novo.");
      } finally {
        setBusy(false);
      }
    },
    [applyState, say, demo],
  );

  // relógio da tela e fechamento das obras que terminam
  useEffect(() => {
    const id = window.setInterval(() => {
      const n = Date.now() + offset.current;
      setNowUi(n);
      const s = refs.current.st;
      if (!demo && !refreshing.current && s.buildings.some((b) => b.upEnds !== null && b.upEnds <= n)) {
        refreshing.current = true;
        getTribos()
          .then((r) => r.state && applyState(r.state))
          .finally(() => {
            refreshing.current = false;
          });
      }
    }, 1000);
    return () => window.clearInterval(id);
  }, [applyState, demo]);

  // desenho
  useEffect(() => {
    const c = cv.current;
    const box = wrap.current;
    if (!c || !box) return;
    const ro = new ResizeObserver(() => {
      const r = box.getBoundingClientRect();
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      size.current = { w: r.width, h: r.height, dpr };
      if (!zoomed.current && r.width > 0) {
        zoomed.current = true;
        cam.current.z = Math.max(0.5, Math.min(0.9, r.width / 780));
      }
      c.width = Math.round(r.width * dpr);
      c.height = Math.round(r.height * dpr);
    });
    ro.observe(box);
    let raf = 0;
    const loop = (t: number) => {
      raf = requestAnimationFrame(loop);
      const ctx = c.getContext("2d");
      if (!ctx) return;
      const { w, h, dpr } = size.current;
      const { st: s, sel: selId, ghost: gh } = refs.current;
      const now = Date.now() + offset.current;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.fillStyle = "#1c2a1b";
      ctx.fillRect(0, 0, c.width, c.height);
      applyCam(ctx, cam.current, w, h, dpr);
      drawGround(ctx, s.player.tribe);
      const opts = { tribe: s.player.tribe, now, t, selectedId: selId, hiddenId: gh?.id ?? null, fmtLeft: fmtDuration };
      for (const b of sortForDraw(s.buildings)) {
        if (gh?.id === b.id) continue;
        drawBuilding(ctx, b, opts);
      }
      if (gh) {
        const ok = canPlace(s.buildings, gh.kind, gh.x, gh.y, gh.id ?? undefined);
        const sz = isBuild(gh.kind) ? BUILDINGS[gh.kind].size : 1;
        drawFootprint(ctx, gh.x, gh.y, sz, ok ? "rgba(80,255,120,0.38)" : "rgba(255,60,60,0.42)", ok ? "#46ff7b" : "#ff4040");
        const [cx, cy] = toWorld(gh.x + sz / 2, gh.y + sz / 2);
        ctx.globalAlpha = 0.85;
        ctx.font = `${sz >= 4 ? 40 : 30}px system-ui, "Apple Color Emoji", "Segoe UI Emoji", sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(kindEmoji(gh.kind), cx, cy - 22);
        ctx.globalAlpha = 1;
      }
    };
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, []);

  // gestos: arrastar o mapa, pinça, toque e arrastar o fantasma
  const ptrs = useRef(new Map<number, { x: number; y: number }>());
  const gest = useRef({ mode: "none" as "none" | "pan" | "ghost" | "pinch", sx: 0, sy: 0, cx: 0, cy: 0, moved: false, d0: 0, z0: 1, ox: 0, oy: 0 });

  const tileAt = (clientX: number, clientY: number): [number, number] => {
    const r = cv.current!.getBoundingClientRect();
    return screenToTile(cam.current, r.width, r.height, clientX - r.left, clientY - r.top);
  };

  const buildingAt = (tx: number, ty: number): TBuilding | null => {
    const x = Math.floor(tx);
    const y = Math.floor(ty);
    const list = sortForDraw(refs.current.st.buildings).reverse();
    for (const b of list) {
      const f = footprint(b.kind, b.x, b.y);
      if (x >= f.x0 && x <= f.x1 && y >= f.y0 && y <= f.y1) return b;
    }
    return null;
  };

  const onDown = (e: React.PointerEvent) => {
    cv.current?.setPointerCapture(e.pointerId);
    ptrs.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const g = gest.current;
    if (ptrs.current.size === 2) {
      const [a, b] = [...ptrs.current.values()];
      g.mode = "pinch";
      g.d0 = Math.hypot(a.x - b.x, a.y - b.y) || 1;
      g.z0 = cam.current.z;
      g.moved = true;
      return;
    }
    g.sx = e.clientX;
    g.sy = e.clientY;
    g.cx = cam.current.x;
    g.cy = cam.current.y;
    g.moved = false;
    const gh = refs.current.ghost;
    const [tx, ty] = tileAt(e.clientX, e.clientY);
    if (gh) {
      const sz = isBuild(gh.kind) ? BUILDINGS[gh.kind].size : 1;
      if (tx >= gh.x - 0.5 && tx <= gh.x + sz + 0.5 && ty >= gh.y - 0.5 && ty <= gh.y + sz + 0.5) {
        g.mode = "ghost";
        g.ox = tx - gh.x;
        g.oy = ty - gh.y;
        return;
      }
    }
    g.mode = "pan";
  };

  const onMove = (e: React.PointerEvent) => {
    const p = ptrs.current.get(e.pointerId);
    if (!p) return;
    p.x = e.clientX;
    p.y = e.clientY;
    const g = gest.current;
    if (g.mode === "pinch" && ptrs.current.size >= 2) {
      const [a, b] = [...ptrs.current.values()];
      const d = Math.hypot(a.x - b.x, a.y - b.y) || 1;
      cam.current.z = Math.max(0.4, Math.min(1.8, (g.z0 * d) / g.d0));
      return;
    }
    const dx = e.clientX - g.sx;
    const dy = e.clientY - g.sy;
    if (!g.moved && Math.hypot(dx, dy) > 6) g.moved = true;
    if (g.mode === "pan" && g.moved) {
      cam.current.x = g.cx - dx / cam.current.z;
      cam.current.y = g.cy - dy / cam.current.z;
    } else if (g.mode === "ghost") {
      const [tx, ty] = tileAt(e.clientX, e.clientY);
      setGhost((gh) => (gh ? { ...gh, x: Math.round(tx - g.ox), y: Math.round(ty - g.oy) } : gh));
    }
  };

  const onUp = (e: React.PointerEvent) => {
    ptrs.current.delete(e.pointerId);
    const g = gest.current;
    if (g.mode === "pinch") {
      if (ptrs.current.size < 2) g.mode = "none";
      return;
    }
    const wasTap = !g.moved && g.mode === "pan";
    g.mode = "none";
    if (!wasTap || refs.current.ghost) return;
    const [tx, ty] = tileAt(e.clientX, e.clientY);
    const b = buildingAt(tx, ty);
    setShop(false);
    setSel(b ? b.id : null);
    if (b && isBuild(b.kind) && BUILDINGS[b.kind].makes && produced(b, Date.now() + offset.current) >= 1) void run(() => collect(b.id));
  };

  const onWheel = (e: React.WheelEvent) => {
    cam.current.z = Math.max(0.4, Math.min(1.8, cam.current.z * (e.deltaY > 0 ? 0.92 : 1.08)));
  };

  // limites da câmera
  useEffect(() => {
    const id = window.setInterval(() => {
      const [mx] = toWorld(GRID, 0);
      const c = cam.current;
      c.x = Math.max(-mx - 40, Math.min(mx + 40, c.x));
      c.y = Math.max(-40, Math.min(GRID * TH + 80, c.y));
    }, 120);
    return () => window.clearInterval(id);
  }, []);

  const selected = st.buildings.find((b) => b.id === sel) ?? null;
  const th = thLevel(st.buildings);
  const builders = builderCount(st.buildings);
  const busyB = busyCount(st.buildings, nowUi);
  const capGold = capacity(st.buildings, "gold");
  const capMana = capacity(st.buildings, "mana");
  const lvl = playerLevel(st.player.xp);
  const xpPct = Math.min(100, Math.round(((st.player.xp - xpForLevel(lvl)) / Math.max(1, xpForLevel(lvl + 1) - xpForLevel(lvl))) * 100));
  const readyAll = useMemo(
    () => st.buildings.some((b) => isBuild(b.kind) && BUILDINGS[b.kind].makes && produced(b, nowUi) >= 1),
    [st.buildings, nowUi],
  );

  const startPlace = (kind: BuildKind) => {
    const r = wrap.current!.getBoundingClientRect();
    const [tx, ty] = screenToTile(cam.current, r.width, r.height, r.width / 2, r.height / 2);
    const [x, y] = findSpot(st.buildings, kind, tx, ty);
    setShop(false);
    setSel(null);
    setGhost({ kind, id: null, x, y });
  };

  const startMove = (b: TBuilding) => {
    setGhost({ kind: b.kind, id: b.id, x: b.x, y: b.y });
    setSel(null);
  };

  const ghostQuote: Quote | null = ghost && !ghost.id && isBuild(ghost.kind) ? quoteBuild(st, ghost.kind, nowUi) : null;
  const ghostOk = ghost ? canPlace(st.buildings, ghost.kind, ghost.x, ghost.y, ghost.id ?? undefined) : false;

  const confirmGhost = () => {
    if (!ghost || !ghostOk) return;
    const g = ghost;
    if (g.id) void run(() => moveBuilding(g.id!, g.x, g.y), () => setGhost(null));
    else void run(() => buildNew(g.kind, g.x, g.y, (ghostQuote?.missing ?? 0) > 0), () => setGhost(null));
  };

  const quoteLine = (q: Quote) => (
    <span>
      {RES_EMOJI[q.pay]} {fmtNum(q.cost)}
      {q.secs > 0 ? ` · ⏱ ${fmtDuration(q.secs)}` : ""}
    </span>
  );

  const panel = (b: TBuilding) => {
    const name = kindName(b.kind);
    const running = inProgress(b, nowUi);
    if (isObstacle(b.kind)) {
      const q = quoteRemove(st, b, nowUi);
      return (
        <>
          <p className="text-base font-black">{kindEmoji(b.kind)} {name}</p>
          <p className="text-xs opacity-80">Atrapalha o espaço da vila. Remover custa ouro, usa um obreiro e rende XP e, às vezes, gemas.</p>
          {running ? (
            <button disabled={busy} onClick={() => run(() => speedUp(b.id))} className="btn btn-primary mt-2 w-full !py-2.5">⚡ Terminar agora · 💎 {speedUpGems(b, nowUi)}</button>
          ) : (
            <button disabled={busy || !q.ok} onClick={() => run(() => removeObstacle(b.id, q.missing > 0), () => setSel(null))} className="btn btn-primary mt-2 w-full !py-2.5">
              {q.ok ? (q.missing > 0 ? <>Remover · usar 💎 {q.gemsForMissing} <small>(faltam {fmtNum(q.missing)} {RES_EMOJI.gold})</small></> : <>Remover {quoteLine(q)}</>) : q.error}
            </button>
          )}
        </>
      );
    }
    if (!isBuild(b.kind)) return null;
    const def = BUILDINGS[b.kind];
    const ld = levelDef(b.kind, Math.max(1, b.level));
    const q = quoteUpgrade(st, b, nowUi);
    const amount = def.makes ? Math.floor(produced(b, nowUi)) : 0;
    const next = levelDef(b.kind, b.level + 1);
    return (
      <>
        <p className="text-base font-black">
          {b.kind === "hq" ? tribe.mascot : def.emoji} {name} <span className="text-xs font-bold opacity-70">· Nv {Math.max(b.level, 1)}{running && b.upTo ? ` → ${b.upTo}` : ""}</span>
        </p>
        <p className="text-xs opacity-80">{def.desc}</p>
        {def.makes && ld ? (
          <p className="mt-1 text-xs font-bold">
            {RES_EMOJI[def.makes]} {fmtNum(amount)} / {fmtNum(ld.cap ?? 0)} · {fmtNum(ld.rate ?? 0)}/h{next?.rate ? <span className="opacity-70"> (próximo: {fmtNum(next.rate)}/h)</span> : null}
          </p>
        ) : null}
        {def.stores && ld ? <p className="mt-1 text-xs font-bold">Guarda {fmtNum(ld.cap ?? 0)} {RES_EMOJI[def.stores]}{next?.cap ? <span className="opacity-70"> (próximo: {fmtNum(next.cap)})</span> : null}</p> : null}
        {b.kind === "hq" && ld ? <p className="mt-1 text-xs font-bold">Guarda {fmtNum(ld.cap ?? 0)} 🪙💧 · libera novas construções e níveis</p> : null}
        <div className="mt-2 grid gap-2">
          {running ? (
            <button disabled={busy} onClick={() => run(() => speedUp(b.id))} className="btn btn-primary w-full !py-2.5">⚡ Terminar agora · 💎 {speedUpGems(b, nowUi)}</button>
          ) : null}
          {def.makes && amount >= 1 && !running ? (
            <button disabled={busy} onClick={() => run(() => collect(b.id))} className="btn btn-soft w-full !py-2.5">{RES_EMOJI[def.makes]} Coletar {fmtNum(amount)}</button>
          ) : null}
          {!running && b.kind !== "hut" ? (
            <button disabled={busy || !q.ok} onClick={() => run(() => upgradeBuilding(b.id, q.missing > 0))} className="btn btn-primary w-full !py-2.5">
              {q.ok ? (q.missing > 0 ? <>Melhorar · usar 💎 {q.gemsForMissing} <small>(faltam {fmtNum(q.missing)} {RES_EMOJI[q.pay]})</small></> : <>Melhorar para Nv {q.to} · {quoteLine(q)}</>) : q.error}
            </button>
          ) : null}
          <button disabled={busy} onClick={() => startMove(b)} className="btn btn-ghost w-full !py-2">✥ Mover</button>
        </div>
      </>
    );
  };

  return (
    <div className="fixed inset-0 z-[70] select-none overflow-hidden bg-[#1c2a1b] font-sans text-white" style={{ touchAction: "none" }}>
      <div ref={wrap} className="absolute inset-0">
        <canvas ref={cv} onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp} onWheel={onWheel} className="block h-full w-full touch-none" />
      </div>

      {/* topo: tribo, nível e recursos */}
      <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between gap-2 p-2">
        <div className="pointer-events-auto flex items-center gap-2">
          <Link href="/app/jogos" aria-label="Sair" className="grid h-9 w-9 place-items-center rounded-full bg-black/55 text-lg font-black">✕</Link>
          <div className="rounded-xl bg-black/55 px-2.5 py-1" style={{ borderLeft: `4px solid ${tribe.color}` }}>
            <p className="text-[11px] font-black leading-tight">{tribe.mascot} {tribe.name} · Nv {lvl}</p>
            <div className="mt-0.5 h-1.5 w-24 overflow-hidden rounded-full bg-white/20"><div className="h-full" style={{ width: `${xpPct}%`, background: tribe.color }} /></div>
          </div>
        </div>
        <div className="pointer-events-auto flex flex-col items-end gap-1 text-xs font-black">
          <Res emoji="🪙" v={st.player.gold} cap={capGold} color="#f6c52b" />
          <Res emoji="💧" v={st.player.mana} cap={capMana} color="#35b8ee" />
          <span className="rounded-full bg-black/55 px-2.5 py-1">💎 {fmtNum(st.player.gems)}</span>
          <span className="rounded-full bg-black/55 px-2.5 py-1">🛖 {builders - busyB}/{builders} obreiros</span>
        </div>
      </div>

      {toast ? <p className="pointer-events-none absolute inset-x-0 top-16 mx-auto w-fit max-w-[88%] rounded-full bg-black/80 px-4 py-2 text-center text-xs font-black">{toast}</p> : null}

      {/* fantasma: confirmar ou cancelar */}
      {ghost ? (
        <div className="absolute inset-x-0 bottom-0 p-3">
          <div className="mx-auto max-w-md rounded-2xl bg-black/75 p-3 text-center">
            <p className="text-sm font-black">{kindEmoji(ghost.kind)} {kindName(ghost.kind)}</p>
            <p className="text-[11px] opacity-80">Arraste para o lugar certo. {ghost.id ? "" : ghostQuote?.ok ? "" : ghostQuote?.error}</p>
            {ghostQuote?.ok ? <p className="mt-0.5 text-xs font-bold">{quoteLine(ghostQuote)}{ghostQuote.missing > 0 ? ` · usa 💎 ${ghostQuote.gemsForMissing}` : ""}</p> : null}
            <div className="mt-2 flex gap-2">
              <button onClick={() => setGhost(null)} className="btn btn-ghost flex-1 !py-2.5">✖ Cancelar</button>
              <button disabled={busy || !ghostOk || (!ghost.id && !ghostQuote?.ok)} onClick={confirmGhost} className="btn btn-primary flex-1 !py-2.5">✔ Confirmar</button>
            </div>
          </div>
        </div>
      ) : selected ? (
        <div className="absolute inset-x-0 bottom-0 p-3">
          <div className="relative mx-auto max-w-md rounded-2xl bg-black/80 p-3">
            <button onClick={() => setSel(null)} aria-label="Fechar" className="absolute right-2 top-2 text-lg font-black opacity-70">✕</button>
            {panel(selected)}
          </div>
        </div>
      ) : shop ? (
        <div className="absolute inset-x-0 bottom-0 p-3">
          <div className="relative mx-auto max-w-md rounded-2xl bg-black/85 p-3">
            <button onClick={() => setShop(false)} aria-label="Fechar" className="absolute right-2 top-2 text-lg font-black opacity-70">✕</button>
            <p className="text-sm font-black">🛒 Loja da vila</p>
            <div className="mt-2 grid max-h-[46dvh] grid-cols-2 gap-2 overflow-y-auto">
              {BUILD_KINDS.filter((k) => k !== "hq").map((k) => {
                const d = BUILDINGS[k];
                const have = st.buildings.filter((b) => b.kind === k).length;
                const max = d.count[Math.min(MAX_TH, th) - 1];
                const q = quoteBuild(st, k, nowUi);
                return (
                  <button key={k} disabled={!q.ok} onClick={() => startPlace(k)} className="rounded-xl bg-white/10 p-2 text-left text-white disabled:opacity-45">
                    <p className="text-xl">{d.emoji}</p>
                    <p className="text-xs font-black leading-tight">{d.name}</p>
                    <p className="text-[10px] opacity-75">{have}/{max}</p>
                    <p className="mt-0.5 text-[11px] font-bold">{q.ok ? quoteLine(q) : <span className="text-rose-300">{q.error?.slice(0, 48)}</span>}</p>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      ) : (
        <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-2 p-3">
          <div className="flex gap-2">
            <button onClick={() => setShop(true)} className="grid h-14 w-14 place-items-center rounded-2xl text-2xl shadow-lg" style={{ background: tribe.color }} aria-label="Loja">🛒</button>
            <button disabled title="Em breve" className="grid h-14 w-14 place-items-center rounded-2xl bg-black/55 text-2xl opacity-60" aria-label="Exército (em breve)">🪖</button>
          </div>
          <div className="flex gap-2">
            <button disabled={busy || !readyAll} onClick={() => run(() => collect("all"))} className="h-14 rounded-2xl bg-black/65 px-4 text-xs font-black disabled:opacity-40">🪙💧<br />Coletar tudo</button>
            <button disabled title="Em breve" className="h-14 rounded-2xl bg-rose-700/80 px-5 text-sm font-black opacity-60">⚔️ Atacar<br /><small className="font-bold">em breve</small></button>
          </div>
        </div>
      )}
    </div>
  );
}

function Res({ emoji, v, cap, color }: { emoji: string; v: number; cap: number; color: string }) {
  const full = cap > 0 && v >= cap;
  return (
    <span className="relative min-w-[110px] overflow-hidden rounded-full bg-black/55 px-2.5 py-1 text-right">
      <span className="absolute inset-y-0 left-0 opacity-45" style={{ width: `${Math.min(100, (v / Math.max(1, cap)) * 100)}%`, background: color }} />
      <span className="relative">{emoji} {fmtNum(v)}{full ? " (cheio)" : ""}</span>
    </span>
  );
}

