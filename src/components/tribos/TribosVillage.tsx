"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { buildNew, buyBag, collect, getTribos, moveBuilding, removeObstacle, speedUp, upgradeBuilding, type TribosResult } from "@/lib/actions/tribos";
import { BUILDINGS, GRID, TRIBES, fmtDuration, fmtNum, isBuild, isObstacle, levelDef, playerLevel, xpForLevel, type BuildKind, type Kind } from "@/lib/tribos/data";
import {
  builderCount, busyCount, canPlace, capacity, footprint, inProgress, kindName, produced, quoteBuild, quoteRemove, quoteUpgrade, speedUpGems,
  type Quote, type TBuilding, type TState,
} from "@/lib/tribos/state";
import { TH, applyCam, drawBuilding, drawFootprint, drawGround, loadTribosAssets, screenToTile, sortForDraw, toWorld, voidColor, type Cam } from "./render";
import { BigButton, BuilderChip, CostPill, NameBanner, Outlined, PlayerCard, ResourceBar, RoundButton, StoneButton } from "./TribosHud";
import { TribeEmblem, type IconName } from "./ui";
import { Crew } from "./workers";
import { TribosShop } from "./TribosShop";
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

export function TribosVillage({ initial, demo = false, name = "" }: { initial: TState; demo?: boolean; name?: string }) {
  const [st, setSt] = useState<TState>(initial);
  const [nowUi, setNowUi] = useState(initial.serverNow);
  const [sel, setSel] = useState<string | null>(null);
  const [ghost, setGhost] = useState<Ghost | null>(null);
  const [shop, setShop] = useState(false);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [menu, setMenu] = useState(false);
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
        cam.current.z = Math.max(0.4, Math.min(0.85, Math.min(r.width / 1150, r.height / 700)));
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

  type Act = { key: string; label: string; icon: IconName | ReactNode; tone: "green" | "red" | "gold" | "violet" | "stone"; sub?: ReactNode; disabled?: boolean; onClick: () => void };

  /** Título, linha de informação e botões de ação da construção selecionada (no estilo do Clash of Clans). */
  const selection = (b: TBuilding): { title: string; sub?: string; info: string; acts: Act[] } => {
    const title = kindName(b.kind);
    const running = inProgress(b, nowUi);
    const acts: Act[] = [];
    const speed: Act | null = running
      ? { key: "speed", label: "Acelerar", icon: "raio", tone: "violet", sub: <CostPill res="gems" n={speedUpGems(b, nowUi)} />, disabled: busy, onClick: () => void run(() => speedUp(b.id)) }
      : null;

    if (isObstacle(b.kind)) {
      const q = quoteRemove(st, b, nowUi);
      if (speed) acts.push(speed);
      else {
        acts.push({
          key: "remove", label: "Remover", icon: "martelo", tone: "green",
          sub: q.ok ? (q.missing > 0 ? <CostPill res="gems" n={q.gemsForMissing} /> : <CostPill res={q.pay} n={q.cost} />) : undefined,
          disabled: busy || !q.ok, onClick: () => void run(() => removeObstacle(b.id, q.missing > 0), () => setSel(null)),
        });
      }
      return { title, info: q.ok ? "Atrapalha o espaço. Remover rende XP e, às vezes, gemas." : (q.error ?? ""), acts };
    }
    if (!isBuild(b.kind)) return { title, info: "", acts };

    const def = BUILDINGS[b.kind];
    const ld = levelDef(b.kind, Math.max(1, b.level));
    const next = levelDef(b.kind, b.level + 1);
    const amount = def.makes ? Math.floor(produced(b, nowUi)) : 0;
    let info = def.desc;
    if (def.makes && ld) info = `${fmtNum(amount)} de ${fmtNum(ld.cap ?? 0)} guardados · ${fmtNum(ld.rate ?? 0)} por hora`;
    else if (def.stores && ld) info = `Guarda ${fmtNum(ld.cap ?? 0)}${next?.cap ? ` (no próximo nível: ${fmtNum(next.cap)})` : ""}`;
    else if (b.kind === "hq" && ld) info = `Guarda ${fmtNum(ld.cap ?? 0)} de ouro e de maná · libera novas construções`;

    if (speed) acts.push(speed);
    if (def.makes && amount >= 1 && !running) {
      acts.push({ key: "collect", label: "Coletar", icon: "bolsa", tone: "gold", sub: <CostPill res={def.makes} n={amount} />, disabled: busy, onClick: () => void run(() => collect(b.id)) });
    }
    if (!running && b.kind !== "hut") {
      const q = quoteUpgrade(st, b, nowUi);
      if (!q.ok) info = q.error ?? info;
      else if (q.secs > 0) info = `${info} · Melhoria: ${fmtDuration(q.secs)}`;
      acts.push({
        key: "upgrade", label: "Melhorar", icon: "seta-cima", tone: "green",
        sub: q.ok ? (q.missing > 0 ? <CostPill res="gems" n={q.gemsForMissing} /> : <CostPill res={q.pay} n={q.cost} />) : undefined,
        disabled: busy || !q.ok, onClick: () => void run(() => upgradeBuilding(b.id, q.missing > 0)),
      });
    }
    acts.push({ key: "move", label: "Mover", icon: <Outlined className="text-[30px] leading-none">✥</Outlined>, tone: "stone", disabled: busy, onClick: () => startMove(b) });
    return { title, sub: `Nível ${Math.max(b.level, 1)}${running && b.upTo ? ` → ${b.upTo}` : ""}`, info, acts };
  };

  const sel2 = selected ? selection(selected) : null;
  const t = tribe;
  const free = builders - busyB;
  const playerName = name || "Chefe";

  return (
    <div className="fixed inset-0 z-[70] select-none overflow-hidden font-sans text-white" style={{ touchAction: "none", background: voidColor(st.player.tribe) }}>
      <div ref={wrap} className="absolute inset-0">
        <canvas ref={cv} onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp} onWheel={onWheel} className="block h-full w-full touch-none" />
      </div>

      {/* topo: jogador à esquerda, obreiros ao centro, recursos à direita */}
      <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between gap-2 p-2">
        <PlayerCard name={playerName} level={lvl} xpPct={xpPct} trophies={st.player.trophies} tribe={st.player.tribe} />
        <div className="absolute left-1/2 top-2 -translate-x-1/2">
          <BuilderChip free={free} total={builders} />
        </div>
        <div className="flex flex-col items-end gap-1.5 pr-1">
          <ResourceBar res="gold" value={st.player.gold} max={capGold} fill="#f2c230" />
          <ResourceBar res="mana" value={st.player.mana} max={capMana} fill="#3fb6ee" />
          <ResourceBar res="gems" value={st.player.gems} fill="#4fa8ff" />
        </div>
      </div>

      {toast ? (
        <p className="pointer-events-none absolute inset-x-0 top-14 mx-auto w-fit max-w-[60%] rounded-xl border-2 border-black/70 bg-[#2a2118]/90 px-4 py-1.5 text-center">
          <Outlined className="text-[13px]">{toast}</Outlined>
        </p>
      ) : null}

      {/* laterais: conquistas à esquerda; engrenagem e tribo à direita */}
      {!ghost && !selected ? (
        <>
          <div className="pointer-events-none absolute bottom-[104px] left-2 flex flex-col gap-2">
            <StoneButton icon="trofeu" label="Conquistas" onClick={() => say("As conquistas chegam em breve.")} />
          </div>
          <div className="pointer-events-none absolute bottom-[104px] right-2 flex flex-col gap-2">
            <StoneButton icon="engrenagem" label="Configurações" onClick={() => setMenu((v) => !v)} />
            <StoneButton icon="dupla" label="Tribo" onClick={() => say("O chat e as guerras da tribo chegam em breve.")} />
          </div>
          {menu ? (
            <div className="absolute bottom-[104px] right-[68px] w-[190px] rounded-xl border-[3px] border-[#3b372d] p-2" style={{ background: "linear-gradient(180deg,#e0dbc7,#a39d87)", boxShadow: "0 4px 0 #1c1a15" }}>
              <p className="mb-1 flex items-center gap-1.5 text-[12px] font-black text-[#2a2118]"><TribeEmblem tribe={st.player.tribe} className="h-6 w-auto" /> Tribo {t.name}</p>
              <Link href="/app/jogos" className="block rounded-lg bg-[#c43d3d] px-2 py-1.5 text-center text-[12px] font-black text-white shadow-[0_2px_0_#6b1c1c]">Sair do jogo</Link>
              <button type="button" onClick={() => setMenu(false)} className="mt-1.5 block w-full rounded-lg bg-black/15 px-2 py-1 text-center text-[11px] font-bold text-[#2a2118]">Fechar</button>
            </div>
          ) : null}
        </>
      ) : null}

      {/* colocar ou mover: nome, preço e os botões redondos de cancelar e confirmar */}
      {ghost ? (
        <div className="pointer-events-none absolute inset-x-0 bottom-2 flex flex-col items-center gap-1">
          <NameBanner title={kindName(ghost.kind)} />
          <Outlined className="max-w-[60%] text-center text-[11px] leading-tight">
            {ghost.id ? "Arraste para o novo lugar." : ghostQuote?.ok ? "Arraste para o lugar certo." : (ghostQuote?.error ?? "")}
          </Outlined>
          <div className="flex items-center gap-4">
            <RoundButton kind="cancel" label="Cancelar" onClick={() => setGhost(null)} />
            {ghostQuote?.ok ? (
              <span className="flex flex-col items-center gap-0.5">
                <CostPill res={ghostQuote.pay} n={ghostQuote.cost} />
                {ghostQuote.missing > 0 ? <CostPill res="gems" n={ghostQuote.gemsForMissing} /> : null}
                {ghostQuote.secs > 0 ? <Outlined className="text-[11px]">⏱ {fmtDuration(ghostQuote.secs)}</Outlined> : null}
              </span>
            ) : null}
            <RoundButton kind="ok" label="Confirmar" disabled={busy || !ghostOk || (!ghost.id && !ghostQuote?.ok)} onClick={confirmGhost} />
          </div>
        </div>
      ) : null}

      {/* construção selecionada: faixa com o nome e botões de ação */}
      {selected && sel2 && !ghost ? (
        <div className="pointer-events-none absolute inset-x-0 bottom-2 flex flex-col items-center gap-1">
          <button type="button" onClick={() => setSel(null)} aria-label="Fechar" className="pointer-events-auto absolute right-3 top-0 grid h-8 w-8 place-items-center rounded-full border-2 border-black/70 bg-[#2a2118]/85">
            <Outlined className="text-[14px]">✕</Outlined>
          </button>
          <NameBanner title={sel2.title} sub={sel2.sub} />
          <Outlined className="max-w-[70%] text-center text-[11px] leading-tight">{sel2.info}</Outlined>
          <div className="mt-0.5 flex items-end justify-center gap-2">
            {sel2.acts.map((a) => (
              <BigButton key={a.key} icon={a.icon} label={a.label} sub={a.sub} tone={a.tone === "stone" ? "stone" : a.tone} tribe={st.player.tribe} disabled={a.disabled} onClick={a.onClick} width={84} height={82} />
            ))}
          </div>
        </div>
      ) : null}

      {shop ? <TribosShop st={st} now={nowUi} busy={busy} onClose={() => setShop(false)} onPlace={startPlace} onBag={(res, pct) => void run(() => buyBag(res, pct))} /> : null}

      {/* base da tela: Loja e atalhos à esquerda, Atacar à direita */}
      {!ghost && !selected ? (
        <>
          <div className="pointer-events-none absolute bottom-2 left-2 flex items-end gap-2">
            <BigButton icon="bau-ouro" label="Loja" tone="tribe" tribe={st.player.tribe} width={96} height={88} onClick={() => { setSel(null); setMenu(false); setShop((v) => !v); }} />
            <div className="relative">
              <StoneButton icon="bolsa" label="Coletar tudo" size={54} disabled={busy || !readyAll} onClick={() => void run(() => collect("all"))} />
              {readyAll ? <span className="absolute -right-1 -top-1 h-3.5 w-3.5 rounded-full border-2 border-black bg-[#ff5a3c]" /> : null}
            </div>
            <StoneButton icon="capacete" label="Exército (em breve)" size={54} disabled />
          </div>
          <div className="pointer-events-none absolute bottom-2 right-2">
            <BigButton icon="espadas" label="Atacar" tone="red" tribe={st.player.tribe} width={104} height={88} disabled badge="Em breve" />
          </div>
        </>
      ) : null}
    </div>
  );
}
