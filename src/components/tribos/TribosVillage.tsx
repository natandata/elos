"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { buildNew, collect, getTribos, moveBuilding, removeObstacle, speedUp, upgradeBuilding, type TribosResult } from "@/lib/actions/tribos";
import { BUILDINGS, BUILD_KINDS, GRID, MAX_TH, TRIBES, fmtDuration, fmtNum, isBuild, isObstacle, levelDef, playerLevel, xpForLevel, type BuildKind, type Kind, type Res } from "@/lib/tribos/data";
import {
  builderCount, busyCount, canPlace, capacity, footprint, inProgress, kindName, produced, quoteBuild, quoteRemove, quoteUpgrade, speedUpGems, thLevel,
  type Quote, type TBuilding, type TState,
} from "@/lib/tribos/state";
import { TH, applyCam, drawBuilding, drawFootprint, drawGround, loadTribosAssets, screenToTile, sortForDraw, toWorld, voidColor, type Cam } from "./render";
import { KindIcon, ResIcon, TIcon, TribeEmblem } from "./ui";
import { Crew } from "./workers";
import { footprint as fp } from "@/lib/tribos/state";

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

function Cost({ q }: { q: Quote }) {
  return (
    <span className="inline-flex items-center gap-1">
      <ResIcon res={q.pay} className="h-4 w-4" />
      {fmtNum(q.cost)}
      {q.secs > 0 ? (
        <>
          <span className="opacity-50">·</span>
          <TIcon name="ampulheta" className="h-4 w-4" />
          {fmtDuration(q.secs)}
        </>
      ) : null}
    </span>
  );
}

function Gems({ n, prefix }: { n: number; prefix?: string }) {
  return (
    <span className="inline-flex items-center gap-1">
      {prefix}
      <ResIcon res="gems" className="h-4 w-4" />
      {fmtNum(n)}
    </span>
  );
}

function TopRes({ res, v, cap, color }: { res: Res; v: number; cap: number; color: string }) {
  const full = cap > 0 && v >= cap;
  return (
    <span className="relative flex min-w-[118px] items-center justify-end gap-1.5 overflow-hidden rounded-full bg-black/60 py-1 pl-2 pr-1.5 text-right text-xs font-black">
      <span className="absolute inset-y-0 left-0 opacity-50" style={{ width: `${cap > 0 ? Math.min(100, (v / Math.max(1, cap)) * 100) : 0}%`, background: color }} />
      <span className="relative">{fmtNum(v)}{full ? " (cheio)" : ""}</span>
      <ResIcon res={res} className="relative h-5 w-5" />
    </span>
  );
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
  const cam = useRef<Cam>({ x: 0, y: 640, z: 0.7 });
  const size = useRef({ w: 800, h: 380, dpr: 1 });
  const offset = useRef(initial.serverNow - Date.now());
  const refs = useRef({ st: initial, sel: null as string | null, ghost: null as Ghost | null });
  const refreshing = useRef(false);
  const zoomed = useRef(false);
  const crew = useRef(new Crew());
  const lastT = useRef(0);

  const tribe = TRIBES[st.player.tribe];

  useEffect(() => {
    refs.current = { st, sel, ghost };
  }, [st, sel, ghost]);

  useEffect(() => {
    void loadTribosAssets();
  }, []);

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
      c.width = Math.round(r.width * dpr);
      c.height = Math.round(r.height * dpr);
      if (!zoomed.current && r.width > 0) {
        zoomed.current = true;
        cam.current.z = Math.max(0.45, Math.min(0.9, Math.min(r.width / 1000, r.height / 560)));
      }
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
      ctx.fillStyle = voidColor(s.player.tribe);
      ctx.fillRect(0, 0, c.width, c.height);
      applyCam(ctx, cam.current, w, h, dpr);
      drawGround(ctx, s.player.tribe);
      const opts = { tribe: s.player.tribe, now, t, selectedId: selId, hiddenId: gh?.id ?? null, fmtLeft: fmtDuration };
      const last = lastT.current || t;
      lastT.current = t;
      crew.current.update((t - last) / 1000, now, s.buildings);
      // construções e obreiros juntos, do fundo para a frente
      const items: { depth: number; draw: () => void }[] = [];
      for (const b of s.buildings) {
        if (gh?.id === b.id) continue;
        const f = fp(b.kind, b.x, b.y);
        items.push({ depth: f.x1 + f.y1, draw: () => drawBuilding(ctx, b, opts) });
      }
      for (const it of crew.current.items(s.player.tribe)) items.push({ depth: it.depth, draw: () => it.draw(ctx, t) });
      items.sort((a, b) => a.depth - b.depth);
      for (const it of items) it.draw();
      crew.current.drawParticles(ctx);
      if (gh) {
        const ok = canPlace(s.buildings, gh.kind, gh.x, gh.y, gh.id ?? undefined);
        const sz = isBuild(gh.kind) ? BUILDINGS[gh.kind].size : 1;
        drawFootprint(ctx, gh.x, gh.y, sz, ok ? "rgba(80,255,120,0.38)" : "rgba(255,60,60,0.42)", ok ? "#46ff7b" : "#ff4040");
        // pré-visualização: a própria construção, translúcida
        ctx.globalAlpha = 0.7;
        drawBuilding(ctx, { id: "ghost", kind: gh.kind, level: 1, x: gh.x, y: gh.y, upTo: null, upEnds: null, upStarted: null, stored: 0, collectedAt: now }, { ...opts, selectedId: null });
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
  const readyAll = useMemo(() => st.buildings.some((b) => isBuild(b.kind) && BUILDINGS[b.kind].makes && produced(b, nowUi) >= 1), [st.buildings, nowUi]);

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

  const upgradeLabel = (q: Quote, verb: string) =>
    !q.ok ? (
      q.error
    ) : q.missing > 0 ? (
      <span className="inline-flex flex-wrap items-center justify-center gap-1">
        {verb} · usar <Gems n={q.gemsForMissing} /> <small className="inline-flex items-center gap-0.5 opacity-80">(faltam {fmtNum(q.missing)} <ResIcon res={q.pay} className="h-3 w-3" />)</small>
      </span>
    ) : (
      <span className="inline-flex flex-wrap items-center justify-center gap-1">
        {verb} · <Cost q={q} />
      </span>
    );

  const panel = (b: TBuilding) => {
    const name = kindName(b.kind);
    const running = inProgress(b, nowUi);
    const speed = (
      <button disabled={busy} onClick={() => run(() => speedUp(b.id))} className="btn btn-primary w-full !py-2">
        <Gems n={speedUpGems(b, nowUi)} prefix="⚡ Terminar agora · " />
      </button>
    );
    if (isObstacle(b.kind)) {
      const q = quoteRemove(st, b, nowUi);
      return (
        <>
          <p className="flex items-center gap-2 pr-6 text-base font-black"><KindIcon kind={b.kind} className="h-9 w-9" />{name}</p>
          <p className="mt-1 text-xs opacity-80">Ocupa espaço na vila. Remover custa ouro, usa um obreiro e rende XP e, às vezes, gemas.</p>
          <div className="mt-2 grid gap-2">
            {running ? speed : (
              <button disabled={busy || !q.ok} onClick={() => run(() => removeObstacle(b.id, q.missing > 0), () => setSel(null))} className="btn btn-primary w-full !py-2">
                {upgradeLabel(q, "Remover")}
              </button>
            )}
          </div>
        </>
      );
    }
    if (!isBuild(b.kind)) return null;
    const def = BUILDINGS[b.kind];
    const ld = levelDef(b.kind, Math.max(1, b.level));
    const q = quoteUpgrade(st, b, nowUi);
    const amount = def.makes ? Math.floor(produced(b, nowUi)) : 0;
    const next = levelDef(b.kind, b.level + 1);
    const resIcon = def.makes ?? def.stores;
    return (
      <>
        <p className="flex items-center gap-2 pr-6 text-base font-black leading-tight">
          {b.kind === "hq" ? <TribeEmblem tribe={st.player.tribe} className="h-9 w-auto" /> : <KindIcon kind={b.kind} className="h-9 w-9" />}
          <span>{name} <span className="block text-[11px] font-bold opacity-70">Nível {Math.max(b.level, 1)}{running && b.upTo ? ` → ${b.upTo}` : ""}</span></span>
        </p>
        <p className="mt-1 text-xs opacity-80">{def.desc}</p>
        {def.makes && ld ? (
          <p className="mt-1 flex flex-wrap items-center gap-1 text-xs font-bold">
            <ResIcon res={def.makes} className="h-4 w-4" /> {fmtNum(amount)} / {fmtNum(ld.cap ?? 0)} · {fmtNum(ld.rate ?? 0)}/h{next?.rate ? <span className="opacity-70"> (próximo: {fmtNum(next.rate)}/h)</span> : null}
          </p>
        ) : null}
        {def.stores && ld ? (
          <p className="mt-1 flex flex-wrap items-center gap-1 text-xs font-bold">
            Guarda {fmtNum(ld.cap ?? 0)} {resIcon ? <ResIcon res={resIcon} className="h-4 w-4" /> : null}{next?.cap ? <span className="opacity-70"> (próximo: {fmtNum(next.cap)})</span> : null}
          </p>
        ) : null}
        {b.kind === "hq" && ld ? <p className="mt-1 text-xs font-bold">Guarda {fmtNum(ld.cap ?? 0)} de ouro e de maná · libera novas construções e níveis</p> : null}
        <div className="mt-2 grid gap-1.5">
          {running ? speed : null}
          {def.makes && amount >= 1 && !running ? (
            <button disabled={busy} onClick={() => run(() => collect(b.id))} className="btn btn-soft w-full !py-2">
              <span className="inline-flex items-center gap-1">Coletar {fmtNum(amount)} <ResIcon res={def.makes} className="h-4 w-4" /></span>
            </button>
          ) : null}
          {!running && b.kind !== "hut" ? (
            <button disabled={busy || !q.ok} onClick={() => run(() => upgradeBuilding(b.id, q.missing > 0))} className="btn btn-primary w-full !py-2">
              {upgradeLabel(q, `Melhorar para Nv ${q.to}`)}
            </button>
          ) : null}
          <button disabled={busy} onClick={() => startMove(b)} className="btn btn-ghost w-full !py-1.5">✥ Mover</button>
        </div>
      </>
    );
  };

  const sheet = "absolute bottom-2 right-2 w-[min(330px,46vw)] rounded-2xl bg-black/80 p-3 text-white backdrop-blur-sm";

  return (
    <div className="fixed inset-0 z-[70] select-none overflow-hidden font-sans text-white" style={{ touchAction: "none", background: voidColor(st.player.tribe) }}>
      <div ref={wrap} className="absolute inset-0">
        <canvas ref={cv} onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp} onWheel={onWheel} className="block h-full w-full touch-none" />
      </div>

      {/* topo: tribo, nível e recursos */}
      <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between gap-2 p-2">
        <div className="pointer-events-auto flex items-center gap-2">
          <Link href="/app/jogos" aria-label="Sair" className="grid h-9 w-9 place-items-center rounded-full bg-black/60 text-lg font-black">✕</Link>
          <div className="flex items-center gap-2 rounded-xl bg-black/60 py-1 pl-1.5 pr-3">
            <TribeEmblem tribe={st.player.tribe} className="h-9 w-auto" />
            <div>
              <p className="text-xs font-black leading-tight">{tribe.name} · Nível {lvl}</p>
              <div className="mt-1 h-1.5 w-24 overflow-hidden rounded-full bg-white/20"><div className="h-full" style={{ width: `${xpPct}%`, background: tribe.color }} /></div>
            </div>
          </div>
          <span className="flex items-center gap-1 rounded-full bg-black/60 px-2.5 py-1 text-xs font-black"><TIcon name="martelo" className="h-4 w-4" /> {builders - busyB}/{builders}</span>
        </div>
        <div className="pointer-events-auto flex flex-col items-end gap-1">
          <TopRes res="gold" v={st.player.gold} cap={capGold} color="#f6c52b" />
          <TopRes res="mana" v={st.player.mana} cap={capMana} color="#35b8ee" />
          <TopRes res="gems" v={st.player.gems} cap={0} color="#7aa7ff" />
        </div>
      </div>

      {toast ? <p className="pointer-events-none absolute inset-x-0 top-3 mx-auto w-fit max-w-[60%] rounded-full bg-black/85 px-4 py-2 text-center text-xs font-black">{toast}</p> : null}

      {/* fantasma: confirmar ou cancelar */}
      {ghost ? (
        <div className="absolute inset-x-0 bottom-2 mx-auto w-[min(420px,70vw)] rounded-2xl bg-black/80 p-2.5 text-center text-white">
          <p className="flex items-center justify-center gap-2 text-sm font-black"><KindIcon kind={ghost.kind} className="h-7 w-7" />{kindName(ghost.kind)}</p>
          <p className="text-[11px] opacity-80">Arraste para o lugar certo. {ghost.id ? "" : ghostQuote?.ok ? "" : ghostQuote?.error}</p>
          {ghostQuote?.ok ? (
            <p className="mt-0.5 flex items-center justify-center gap-2 text-xs font-bold"><Cost q={ghostQuote} />{ghostQuote.missing > 0 ? <Gems n={ghostQuote.gemsForMissing} prefix="usa " /> : null}</p>
          ) : null}
          <div className="mt-1.5 flex gap-2">
            <button onClick={() => setGhost(null)} className="btn btn-ghost flex-1 !py-2">✖ Cancelar</button>
            <button disabled={busy || !ghostOk || (!ghost.id && !ghostQuote?.ok)} onClick={confirmGhost} className="btn btn-primary flex-1 !py-2">✔ Confirmar</button>
          </div>
        </div>
      ) : selected ? (
        <div className={sheet}>
          <button onClick={() => setSel(null)} aria-label="Fechar" className="absolute right-2 top-2 text-lg font-black opacity-70">✕</button>
          {panel(selected)}
        </div>
      ) : shop ? (
        <div className={`${sheet} w-[min(420px,56vw)]`}>
          <button onClick={() => setShop(false)} aria-label="Fechar" className="absolute right-2 top-2 text-lg font-black opacity-70">✕</button>
          <p className="flex items-center gap-1.5 text-sm font-black"><TIcon name="casa" className="h-5 w-5" /> Loja da vila</p>
          <div className="mt-2 grid max-h-[62dvh] grid-cols-3 gap-2 overflow-y-auto">
            {BUILD_KINDS.filter((k) => k !== "hq").map((k) => {
              const d = BUILDINGS[k];
              const have = st.buildings.filter((b) => b.kind === k).length;
              const max = d.count[Math.min(MAX_TH, th) - 1];
              const q = quoteBuild(st, k, nowUi);
              return (
                <button key={k} disabled={!q.ok} onClick={() => startPlace(k)} className="rounded-xl bg-white/10 p-2 text-left text-white disabled:opacity-45">
                  <KindIcon kind={k} className="h-10 w-10" />
                  <p className="text-[11px] font-black leading-tight">{d.name}</p>
                  <p className="text-[10px] opacity-75">{have}/{max}</p>
                  <p className="mt-0.5 text-[10px] font-bold">{q.ok ? <Cost q={q} /> : <span className="text-rose-300">{q.error?.slice(0, 40)}</span>}</p>
                </button>
              );
            })}
          </div>
        </div>
      ) : null}

      {/* barra de baixo */}
      {!ghost ? (
        <div className="pointer-events-none absolute bottom-2 left-2 flex items-end gap-2">
          <button onClick={() => { setSel(null); setShop((v) => !v); }} className="pointer-events-auto grid h-14 w-14 place-items-center rounded-2xl shadow-lg" style={{ background: tribe.color }} aria-label="Loja">
            <TIcon name="casa" className="h-9 w-9" />
          </button>
          <button disabled title="Em breve" className="pointer-events-auto grid h-14 w-14 place-items-center rounded-2xl bg-black/60 opacity-60" aria-label="Exército (em breve)">
            <TIcon name="capacete" className="h-9 w-9" />
          </button>
          <button disabled={busy || !readyAll} onClick={() => run(() => collect("all"))} className="pointer-events-auto flex h-14 items-center gap-1.5 rounded-2xl bg-black/65 px-3 text-xs font-black disabled:opacity-40">
            <TIcon name="bolsa" className="h-8 w-8" /> Coletar tudo
          </button>
        </div>
      ) : null}
      {!ghost && !selected && !shop ? (
        <button disabled title="Em breve" className="absolute bottom-2 right-2 flex h-14 items-center gap-2 rounded-2xl bg-rose-700/80 px-5 text-sm font-black opacity-60">
          <TIcon name="espadas" className="h-9 w-9" />
          <span className="text-left leading-tight">Atacar<br /><small className="font-bold">em breve</small></span>
        </button>
      ) : null}
    </div>
  );
}
