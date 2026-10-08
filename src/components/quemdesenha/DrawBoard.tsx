"use client";

import { useEffect, useRef, useState } from "react";
import type { Brush, DrawOp, ShapeKind } from "@/lib/quemdesenha/host";

/** Tela lógica 4:3; as operações viajam em coordenadas de 0 a 1. */
const W = 800;
const H = 600;

/** Paleta no estilo do Paint: duas fileiras (escuras e claras). */
export const PALETTE = [
  "#000000", "#7f7f7f", "#880015", "#ed1c24", "#ff7f27", "#fff200", "#22b14c", "#00a2e8", "#3f48cc", "#a349a4",
  "#ffffff", "#c3c3c3", "#b97a57", "#ffaec9", "#ffc90e", "#efe4b0", "#b5e61d", "#99d9ea", "#7092be", "#c8bfe7",
];

const BRUSHES: { key: Brush; emoji: string; name: string }[] = [
  { key: "l", emoji: "✏️", name: "Lápis" },
  { key: "p", emoji: "🖌️", name: "Pincel macio" },
  { key: "m", emoji: "🖍️", name: "Marcador" },
  { key: "s", emoji: "💨", name: "Spray" },
  { key: "c", emoji: "🖋️", name: "Caligrafia" },
];
const SHAPES: { key: ShapeKind; emoji: string; name: string }[] = [
  { key: "line", emoji: "╱", name: "Linha" },
  { key: "rect", emoji: "▭", name: "Retângulo" },
  { key: "ellipse", emoji: "⬭", name: "Elipse" },
  { key: "triangle", emoji: "△", name: "Triângulo" },
  { key: "diamond", emoji: "◇", name: "Losango" },
  { key: "star", emoji: "☆", name: "Estrela" },
  { key: "arrow", emoji: "➜", name: "Seta" },
];
const FILLS: { key: "o" | "f" | "b"; name: string }[] = [
  { key: "o", name: "Contorno" },
  { key: "f", name: "Cheio" },
  { key: "b", name: "Cheio + contorno" },
];

type Tool = { kind: "brush"; brush: Brush } | { kind: "eraser" } | { kind: "fill" } | { kind: "pick" } | { kind: "shape"; shape: ShapeKind };
type ShapeOp = Extract<DrawOp, { k: "h" }>;

type Stroke = { it: "s"; c: string; w: number; b: Brush; p: number[] };
type Shape = { it: "h"; op: ShapeOp };
type Fill = { it: "b"; c: string; x: number; y: number };
type Item = Stroke | Shape | Fill;

/** Interface que a tela de fora usa para empurrar o desenho dos outros jogadores. */
export type BoardApi = { apply: (op: DrawOp) => void; replay: (ops: readonly DrawOp[]) => void };

// ---------------------------------------------------------------- desenho
/** Números "aleatórios" que dependem só do ponto: o spray sai igual em todos os aparelhos. */
const hash = (a: number, b: number) => {
  let h = (a * 374761393 + b * 668265263) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
};

function paintStroke(ctx: CanvasRenderingContext2D, st: Stroke, from = 0) {
  const n = st.p.length / 2;
  const px = (i: number) => st.p[i * 2] * W;
  const py = (i: number) => st.p[i * 2 + 1] * H;
  ctx.save();
  ctx.strokeStyle = st.c;
  ctx.fillStyle = st.c;
  ctx.lineWidth = st.w;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  if (st.b === "s") {
    // spray: pontinhos espalhados em volta, nove por ponto
    const r = st.w * 1.6;
    for (let i = from; i < n; i++)
      for (let k = 0; k < 9; k++) {
        const a = hash(i + 1, k * 7 + 1) * Math.PI * 2;
        const d = Math.sqrt(hash(i + 3, k * 11 + 5)) * r;
        ctx.fillRect(px(i) + Math.cos(a) * d, py(i) + Math.sin(a) * d, 1.6, 1.6);
      }
  } else if (st.b === "c") {
    // caligrafia: ponta chata inclinada, preenchendo o espaço entre dois pontos
    const vx = Math.cos(Math.PI / 4) * st.w * 0.9;
    const vy = -Math.sin(Math.PI / 4) * st.w * 0.9;
    const seg = (x0: number, y0: number, x1: number, y1: number) => {
      ctx.beginPath();
      ctx.moveTo(x0 - vx, y0 - vy);
      ctx.lineTo(x0 + vx, y0 + vy);
      ctx.lineTo(x1 + vx, y1 + vy);
      ctx.lineTo(x1 - vx, y1 - vy);
      ctx.closePath();
      ctx.fill();
    };
    if (n === 1) seg(px(0), py(0), px(0) + 0.1, py(0));
    for (let i = Math.max(1, from); i < n; i++) seg(px(i - 1), py(i - 1), px(i), py(i));
  } else {
    if (st.b === "p") {
      ctx.shadowColor = st.c;
      ctx.shadowBlur = st.w * 0.7;
    }
    if (st.b === "m") {
      ctx.lineCap = "square";
      ctx.lineJoin = "bevel";
      ctx.lineWidth = st.w * 1.5;
    }
    if (n === 1) {
      ctx.beginPath();
      if (st.b === "m") ctx.rect(px(0) - st.w * 0.75, py(0) - st.w * 0.75, st.w * 1.5, st.w * 1.5);
      else ctx.arc(px(0), py(0), st.w / 2, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.beginPath();
      const start = Math.max(0, from - 1);
      ctx.moveTo(px(start), py(start));
      for (let i = start + 1; i < n; i++) ctx.lineTo(px(i), py(i));
      ctx.stroke();
    }
  }
  ctx.restore();
}

function shapePath(ctx: CanvasRenderingContext2D, op: ShapeOp) {
  const x0 = op.x0 * W;
  const y0 = op.y0 * H;
  const x1 = op.x1 * W;
  const y1 = op.y1 * H;
  const l = Math.min(x0, x1);
  const r = Math.max(x0, x1);
  const t = Math.min(y0, y1);
  const b = Math.max(y0, y1);
  const cx = (l + r) / 2;
  const cy = (t + b) / 2;
  ctx.beginPath();
  switch (op.sh) {
    case "line":
      ctx.moveTo(x0, y0);
      ctx.lineTo(x1, y1);
      break;
    case "rect":
      ctx.rect(l, t, r - l, b - t);
      break;
    case "ellipse":
      ctx.ellipse(cx, cy, Math.max(0.5, (r - l) / 2), Math.max(0.5, (b - t) / 2), 0, 0, Math.PI * 2);
      break;
    case "triangle":
      ctx.moveTo(cx, t);
      ctx.lineTo(r, b);
      ctx.lineTo(l, b);
      ctx.closePath();
      break;
    case "diamond":
      ctx.moveTo(cx, t);
      ctx.lineTo(r, cy);
      ctx.lineTo(cx, b);
      ctx.lineTo(l, cy);
      ctx.closePath();
      break;
    case "star": {
      const R = Math.max(1, Math.min(r - l, b - t) / 2);
      for (let i = 0; i < 10; i++) {
        const a = -Math.PI / 2 + (i * Math.PI) / 5;
        const rad = i % 2 === 0 ? R : R * 0.42;
        const x = cx + Math.cos(a) * rad;
        const y = cy + Math.sin(a) * rad;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      break;
    }
    case "arrow": {
      ctx.moveTo(x0, y0);
      ctx.lineTo(x1, y1);
      const a = Math.atan2(y1 - y0, x1 - x0);
      const h = Math.max(10, op.w * 3);
      ctx.moveTo(x1, y1);
      ctx.lineTo(x1 - Math.cos(a - 0.5) * h, y1 - Math.sin(a - 0.5) * h);
      ctx.moveTo(x1, y1);
      ctx.lineTo(x1 - Math.cos(a + 0.5) * h, y1 - Math.sin(a + 0.5) * h);
      break;
    }
  }
}

function paintShape(ctx: CanvasRenderingContext2D, op: ShapeOp) {
  ctx.save();
  shapePath(ctx, op);
  ctx.lineWidth = op.w;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  const open = op.sh === "line" || op.sh === "arrow";
  if (!open && op.f !== "o") {
    ctx.fillStyle = op.f === "b" ? op.c2 : op.c;
    ctx.fill();
  }
  if (open || op.f !== "f") {
    ctx.strokeStyle = op.c;
    ctx.stroke();
  }
  ctx.restore();
}

const rgb = (hex: string): [number, number, number] => [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)];

/** Balde de tinta: enche a região de cor parecida em volta do ponto (com uma folga para o serrilhado dos traços). */
function floodFill(ctx: CanvasRenderingContext2D, x: number, y: number, hex: string) {
  const sx = Math.max(0, Math.min(W - 1, Math.floor(x * W)));
  const sy = Math.max(0, Math.min(H - 1, Math.floor(y * H)));
  const img = ctx.getImageData(0, 0, W, H);
  const d = img.data;
  const at = (px: number, py: number) => (py * W + px) * 4;
  const o = at(sx, sy);
  const t: [number, number, number] = [d[o], d[o + 1], d[o + 2]];
  const [fr, fg, fb] = rgb(hex);
  if (Math.abs(t[0] - fr) + Math.abs(t[1] - fg) + Math.abs(t[2] - fb) < 6) return;
  const tol = 60;
  const same = (i: number) => Math.abs(d[i] - t[0]) + Math.abs(d[i + 1] - t[1]) + Math.abs(d[i + 2] - t[2]) <= tol;
  const seen = new Uint8Array(W * H);
  const stack: number[] = [sx, sy];
  while (stack.length) {
    const cy = stack.pop()!;
    let cx = stack.pop()!;
    while (cx >= 0 && !seen[cy * W + cx] && same(at(cx, cy))) cx--;
    cx++;
    let up = false;
    let down = false;
    while (cx < W && !seen[cy * W + cx] && same(at(cx, cy))) {
      seen[cy * W + cx] = 1;
      const i = at(cx, cy);
      d[i] = fr;
      d[i + 1] = fg;
      d[i + 2] = fb;
      d[i + 3] = 255;
      if (cy > 0) {
        const ok = !seen[(cy - 1) * W + cx] && same(at(cx, cy - 1));
        if (ok && !up) stack.push(cx, cy - 1);
        up = ok;
      }
      if (cy < H - 1) {
        const ok = !seen[(cy + 1) * W + cx] && same(at(cx, cy + 1));
        if (ok && !down) stack.push(cx, cy + 1);
        down = ok;
      }
      cx++;
    }
  }
  ctx.putImageData(img, 0, 0);
}

type Live = { kind: "stroke"; s: Stroke; sent: number } | { kind: "shape"; x0: number; y0: number; base: ImageData; button: number };

export function DrawBoard({ canDraw, onOp, onReady }: { canDraw: boolean; onOp: (op: DrawOp) => void; onReady: (api: BoardApi) => void }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const items = useRef<Item[]>([]);
  const live = useRef<Live | null>(null);
  const pid = useRef(-1);
  const flushT = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [tool, setTool] = useState<Tool>({ kind: "brush", brush: "l" });
  const [c1, setC1] = useState("#000000");
  const [c2, setC2] = useState("#ffffff");
  const [slot, setSlot] = useState<1 | 2>(1);
  const [size, setSize] = useState(6);
  const [fillMode, setFillMode] = useState<"o" | "f" | "b">("o");
  const cur = useRef({ tool, c1, c2, size, fillMode, slot });
  const onOpRef = useRef(onOp);
  const applyRef = useRef<((op: DrawOp) => void) | null>(null);

  useEffect(() => {
    onOpRef.current = onOp;
  }, [onOp]);
  useEffect(() => {
    cur.current = { tool, c1, c2, size, fillMode, slot };
  }, [tool, c1, c2, size, fillMode, slot]);

  useEffect(() => {
    const cv = ref.current;
    const ctx = cv?.getContext("2d", { willReadFrequently: true });
    if (!cv || !ctx) return;
    const drawItem = (it: Item) => {
      if (it.it === "s") paintStroke(ctx, it);
      else if (it.it === "h") paintShape(ctx, it.op);
      else floodFill(ctx, it.x, it.y, it.c);
    };
    const redraw = () => {
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, W, H);
      for (const it of items.current) drawItem(it);
    };
    redraw();
    const apply = (op: DrawOp) => {
      if (op.k === "s") {
        const st: Stroke = { it: "s", c: op.c, w: op.w, b: op.b ?? "l", p: [op.x, op.y] };
        items.current.push(st);
        paintStroke(ctx, st);
      } else if (op.k === "p") {
        const st = items.current[items.current.length - 1];
        if (!st || st.it !== "s") return;
        const from = st.p.length / 2;
        st.p.push(...op.p);
        paintStroke(ctx, st, from);
      } else if (op.k === "h") {
        items.current.push({ it: "h", op });
        paintShape(ctx, op);
      } else if (op.k === "b") {
        items.current.push({ it: "b", c: op.c, x: op.x, y: op.y });
        floodFill(ctx, op.x, op.y, op.c);
      } else if (op.k === "u") {
        items.current.pop();
        redraw();
      } else if (op.k === "c") {
        items.current = [];
        redraw();
      }
    };
    onReady({
      apply,
      replay: (ops) => {
        items.current = [];
        redraw();
        for (const o of ops) apply(o);
      },
    });
    applyRef.current = apply;
  }, [onReady]);

  const local = (op: DrawOp) => applyRef.current?.(op);
  const norm = (clientX: number, clientY: number) => {
    const r = ref.current!.getBoundingClientRect();
    return [Math.max(0, Math.min(1, (clientX - r.left) / r.width)), Math.max(0, Math.min(1, (clientY - r.top) / r.height))] as const;
  };

  const flush = () => {
    flushT.current = null;
    const l = live.current;
    if (!l || l.kind !== "stroke") return;
    if (l.s.p.length > l.sent) {
      onOpRef.current({ k: "p", p: l.s.p.slice(l.sent) });
      l.sent = l.s.p.length;
    }
  };

  const shapeOp = (l: Extract<Live, { kind: "shape" }>, x: number, y: number): ShapeOp | null => {
    const { tool: t, c1: a, c2: b, size: w, fillMode: fm } = cur.current;
    if (t.kind !== "shape") return null;
    // botão direito troca as duas cores, como no Paint
    return { k: "h", sh: t.shape, c: l.button === 2 ? b : a, c2: l.button === 2 ? a : b, f: fm, w, x0: l.x0, y0: l.y0, x1: x, y1: y };
  };

  const down = (e: React.PointerEvent) => {
    if (!canDraw || pid.current !== -1 || (e.button !== 0 && e.button !== 2)) return;
    const { tool: t, c1: a, c2: b, size: w, slot: sl } = cur.current;
    const color = e.button === 2 ? b : a;
    const [x, y] = norm(e.clientX, e.clientY);
    const cv = ref.current!;
    if (t.kind === "pick") {
      const px = cv.getContext("2d")!.getImageData(Math.min(W - 1, Math.floor(x * W)), Math.min(H - 1, Math.floor(y * H)), 1, 1).data;
      const hex = `#${[px[0], px[1], px[2]].map((v) => v.toString(16).padStart(2, "0")).join("")}`;
      if (e.button === 2 || sl === 2) setC2(hex);
      else setC1(hex);
      setTool({ kind: "brush", brush: "l" });
      return;
    }
    if (t.kind === "fill") {
      const op: DrawOp = { k: "b", c: color, x, y };
      local(op);
      onOpRef.current(op);
      return;
    }
    cv.setPointerCapture(e.pointerId);
    pid.current = e.pointerId;
    if (t.kind === "shape") {
      live.current = { kind: "shape", x0: x, y0: y, base: cv.getContext("2d")!.getImageData(0, 0, W, H), button: e.button };
      return;
    }
    const eraser = t.kind === "eraser";
    const op: DrawOp = { k: "s", c: eraser ? "#ffffff" : color, w: eraser ? Math.max(w, 8) : w, x, y, b: eraser ? "l" : t.brush };
    local(op);
    live.current = { kind: "stroke", s: items.current[items.current.length - 1] as Stroke, sent: 2 };
    onOpRef.current(op);
  };

  const move = (e: React.PointerEvent) => {
    const l = live.current;
    if (!l || pid.current !== e.pointerId) return;
    const ctx = ref.current!.getContext("2d")!;
    if (l.kind === "shape") {
      const [x, y] = norm(e.clientX, e.clientY);
      const op = shapeOp(l, x, y);
      if (!op) return;
      ctx.putImageData(l.base, 0, 0);
      paintShape(ctx, op);
      return;
    }
    // alguns navegadores devolvem a lista vazia (ou nem têm o método): nesse caso vale o próprio evento
    const co = e.nativeEvent.getCoalescedEvents?.() ?? [];
    const events = (co.length ? co : [e.nativeEvent]) as PointerEvent[];
    const pts: number[] = [];
    for (const ev of events) pts.push(...norm(ev.clientX, ev.clientY));
    // o traço é desenhado aqui na hora; só o envio pela rede é em lotes
    const from = l.s.p.length / 2;
    l.s.p.push(...pts);
    paintStroke(ctx, l.s, from);
    if (!flushT.current) flushT.current = setTimeout(flush, 60);
  };

  const up = (e: React.PointerEvent) => {
    const l = live.current;
    if (!l || pid.current !== e.pointerId) return;
    live.current = null;
    pid.current = -1;
    if (l.kind === "shape") {
      ref.current!.getContext("2d")!.putImageData(l.base, 0, 0);
      const [x, y] = norm(e.clientX, e.clientY);
      const op = shapeOp(l, x, y);
      // um clique sem arrastar não faz forma
      if (!op || (Math.abs(x - l.x0) < 0.004 && Math.abs(y - l.y0) < 0.004)) return;
      local(op);
      onOpRef.current(op);
      return;
    }
    if (flushT.current) clearTimeout(flushT.current);
    flushT.current = null;
    // fecha o lote que faltava e o traço
    if (l.s.p.length > l.sent) onOpRef.current({ k: "p", p: l.s.p.slice(l.sent) });
    onOpRef.current({ k: "e" });
  };

  const setColor = (hex: string) => (slot === 1 ? setC1(hex) : setC2(hex));
  const isTool = (t: Tool) => JSON.stringify(t) === JSON.stringify(tool);
  const tb = (t: Tool, label: string, content: React.ReactNode) => (
    <button key={label} type="button" title={label} aria-label={label} onClick={() => setTool(t)} className={`grid h-9 min-w-9 place-items-center rounded-lg border-2 px-1.5 text-base leading-none ${isTool(t) ? "border-[var(--accent)] bg-[var(--accent-soft)]" : "border-[var(--line)]"}`}>
      {content}
    </button>
  );

  return (
    <div className="select-none">
      <div className="relative overflow-hidden rounded-2xl border-[3px] border-[var(--line)] bg-white shadow-inner">
        <canvas
          ref={ref}
          width={W}
          height={H}
          className={`block h-auto w-full touch-none ${canDraw ? (tool.kind === "pick" ? "cursor-copy" : "cursor-crosshair") : ""}`}
          style={{ aspectRatio: `${W} / ${H}` }}
          onPointerDown={down}
          onPointerMove={move}
          onPointerUp={up}
          onPointerCancel={up}
          onContextMenu={(e) => canDraw && e.preventDefault()}
        />
      </div>
      {canDraw ? (
        <div className="mt-2 space-y-2 rounded-2xl border-2 border-[var(--line)] p-2">
          <div className="flex flex-wrap items-center gap-1.5">
            {BRUSHES.map((b) => tb({ kind: "brush", brush: b.key }, b.name, <span aria-hidden>{b.emoji}</span>))}
            <span className="mx-0.5 h-6 w-px bg-[var(--line)]" />
            {tb({ kind: "fill" }, "Balde de tinta", <span aria-hidden>🪣</span>)}
            {tb({ kind: "eraser" }, "Borracha", <span aria-hidden>🧽</span>)}
            {tb({ kind: "pick" }, "Conta-gotas (pega uma cor do desenho)", <span aria-hidden>💉</span>)}
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {SHAPES.map((s) => tb({ kind: "shape", shape: s.key }, s.name, <span aria-hidden className="text-lg">{s.emoji}</span>))}
            {tool.kind === "shape" ? (
              <select value={fillMode} onChange={(e) => setFillMode(e.target.value as "o" | "f" | "b")} aria-label="Preenchimento da forma" className="h-9 rounded-lg border-2 border-[var(--line)] bg-[var(--surface)] px-1 text-xs font-bold">
                {FILLS.map((f) => (
                  <option key={f.key} value={f.key}>{f.name}</option>
                ))}
              </select>
            ) : null}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex gap-1.5">
              {([1, 2] as const).map((n) => (
                <button key={n} type="button" onClick={() => setSlot(n)} aria-label={`Cor ${n}`} className={`grid h-11 w-11 place-items-end rounded-lg border-[3px] p-0.5 text-[9px] font-black ${slot === n ? "border-[var(--accent)]" : "border-[var(--line)]"}`} style={{ background: n === 1 ? c1 : c2, color: "#555" }}>
                  <span className="rounded bg-white/85 px-0.5">Cor {n}</span>
                </button>
              ))}
            </div>
            <div className="grid grid-flow-col grid-rows-2 gap-1">
              {PALETTE.map((c) => (
                <button
                  key={c}
                  type="button"
                  aria-label={`Cor ${c}`}
                  onClick={() => setColor(c)}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    setC2(c);
                  }}
                  className="h-5 w-5 rounded-sm border border-black/30"
                  style={{ background: c }}
                />
              ))}
            </div>
            <label className="grid h-11 cursor-pointer place-items-center rounded-lg border-2 border-[var(--line)] px-2 text-center text-[10px] font-black leading-tight" title="Editar cores">
              🎨 Editar
              <input type="color" value={slot === 1 ? c1 : c2} onChange={(e) => setColor(e.target.value)} className="sr-only" />
            </label>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <label className="flex min-w-0 flex-1 items-center gap-2 text-[11px] font-black text-[var(--muted)]">
              Tamanho
              <input type="range" min={1} max={40} value={size} onChange={(e) => setSize(Number(e.target.value))} className="min-w-0 flex-1" />
              <span className="grid h-8 w-8 shrink-0 place-items-center">
                <span className="rounded-full" style={{ width: Math.max(3, Math.min(32, size)), height: Math.max(3, Math.min(32, size)), background: slot === 1 ? c1 : c2, border: "1px solid #8884" }} />
              </span>
            </label>
            <button
              type="button"
              onClick={() => {
                local({ k: "u" });
                onOpRef.current({ k: "u" });
              }}
              className="btn btn-ghost !px-3 !py-1.5 !text-xs"
            >
              ↶ Desfazer
            </button>
            <button
              type="button"
              onClick={() => {
                local({ k: "c" });
                onOpRef.current({ k: "c" });
              }}
              className="btn btn-ghost !px-3 !py-1.5 !text-xs"
            >
              🗑️ Limpar
            </button>
          </div>
          <p className="text-[10px] text-[var(--muted)]">Botão direito desenha com a Cor 2. Não vale escrever letras ou números!</p>
        </div>
      ) : null}
    </div>
  );
}
