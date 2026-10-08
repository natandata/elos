"use client";

import { useEffect, useRef, useState } from "react";
import type { DrawOp } from "@/lib/quemdesenha/host";

/** Tela lógica 4:3; as operações viajam em coordenadas de 0 a 1. */
const W = 800;
const H = 600;

export const COLORS = ["#111111", "#ffffff", "#e53935", "#fb8c00", "#fdd835", "#43a047", "#00acc1", "#1e88e5", "#5e35b1", "#d81b60", "#8d6e63", "#9e9e9e"];
const SIZES = [4, 10, 22];

type Stroke = { c: string; w: number; p: number[] };

/** Interface que a tela de fora usa para empurrar o desenho dos outros jogadores. */
export type BoardApi = { apply: (op: DrawOp) => void; replay: (ops: readonly DrawOp[]) => void };

function paint(ctx: CanvasRenderingContext2D, st: Stroke, from = 0) {
  ctx.strokeStyle = st.c;
  ctx.fillStyle = st.c;
  ctx.lineWidth = st.w;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  const n = st.p.length / 2;
  if (n === 1) {
    ctx.beginPath();
    ctx.arc(st.p[0] * W, st.p[1] * H, st.w / 2, 0, Math.PI * 2);
    ctx.fill();
    return;
  }
  ctx.beginPath();
  const start = Math.max(0, from - 1);
  ctx.moveTo(st.p[start * 2] * W, st.p[start * 2 + 1] * H);
  for (let i = start + 1; i < n; i++) ctx.lineTo(st.p[i * 2] * W, st.p[i * 2 + 1] * H);
  ctx.stroke();
}

export function DrawBoard({ canDraw, onOp, onReady }: { canDraw: boolean; onOp: (op: DrawOp) => void; onReady: (api: BoardApi) => void }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const strokes = useRef<Stroke[]>([]);
  const drawing = useRef<{ s: Stroke; sent: number; pid: number } | null>(null);
  const flushT = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [color, setColor] = useState(COLORS[0]);
  const [size, setSize] = useState(SIZES[0]);
  const tool = useRef({ color: COLORS[0], size: SIZES[0] });
  const onOpRef = useRef(onOp);
  const applyRef = useRef<((op: DrawOp) => void) | null>(null);

  useEffect(() => {
    onOpRef.current = onOp;
  }, [onOp]);
  useEffect(() => {
    tool.current = { color, size };
  }, [color, size]);

  useEffect(() => {
    const cv = ref.current;
    if (!cv) return;
    const ctx = cv.getContext("2d");
    if (!ctx) return;
    const redraw = () => {
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, W, H);
      for (const st of strokes.current) paint(ctx, st);
    };
    redraw();
    const apply = (op: DrawOp) => {
      if (op.k === "s") {
        strokes.current.push({ c: op.c, w: op.w, p: [op.x, op.y] });
        paint(ctx, strokes.current[strokes.current.length - 1]);
      } else if (op.k === "p") {
        const st = strokes.current[strokes.current.length - 1];
        if (!st) return;
        const from = st.p.length / 2;
        st.p.push(...op.p);
        paint(ctx, st, from);
      } else if (op.k === "u") {
        strokes.current.pop();
        redraw();
      } else if (op.k === "c") {
        strokes.current = [];
        redraw();
      }
    };
    onReady({
      apply,
      replay: (ops) => {
        strokes.current = [];
        redraw();
        for (const o of ops) apply(o);
      },
    });
    // quando o desenhista mexe, o próprio aparelho também desenha: usa o mesmo caminho
    applyRef.current = apply;
  }, [onReady]);

  const point = (e: React.PointerEvent) => {
    const r = ref.current!.getBoundingClientRect();
    return [Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)), Math.max(0, Math.min(1, (e.clientY - r.top) / r.height))] as const;
  };
  const local = (op: DrawOp) => applyRef.current?.(op);
  const flush = () => {
    flushT.current = null;
    const d = drawing.current;
    if (!d) return;
    const total = d.s.p.length;
    if (total > d.sent) {
      onOpRef.current({ k: "p", p: d.s.p.slice(d.sent) });
      d.sent = total;
    }
  };

  const down = (e: React.PointerEvent) => {
    if (!canDraw || e.button > 0) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    const [x, y] = point(e);
    const { color: c, size: w } = tool.current;
    const op: DrawOp = { k: "s", c, w, x, y };
    local(op);
    drawing.current = { s: strokes.current[strokes.current.length - 1], sent: 2, pid: e.pointerId };
    onOpRef.current(op);
  };
  const move = (e: React.PointerEvent) => {
    const d = drawing.current;
    if (!d || d.pid !== e.pointerId) return;
    // alguns navegadores devolvem a lista vazia (ou nem têm o método): nesse caso vale o próprio evento
    const co = e.nativeEvent.getCoalescedEvents?.() ?? [];
    const events = (co.length ? co : [e.nativeEvent]) as PointerEvent[];
    const r = ref.current!.getBoundingClientRect();
    const pts: number[] = [];
    for (const ev of events) pts.push(Math.max(0, Math.min(1, (ev.clientX - r.left) / r.width)), Math.max(0, Math.min(1, (ev.clientY - r.top) / r.height)));
    // o traço é desenhado aqui na hora; só o envio pela rede é em lotes
    const from = d.s.p.length / 2;
    d.s.p.push(...pts);
    const cv = ref.current!;
    const ctx = cv.getContext("2d")!;
    paint(ctx, d.s, from);
    if (!flushT.current) flushT.current = setTimeout(flush, 60);
  };
  const up = (e: React.PointerEvent) => {
    const d = drawing.current;
    if (!d || d.pid !== e.pointerId) return;
    if (flushT.current) clearTimeout(flushT.current);
    flush();
    drawing.current = null;
    onOpRef.current({ k: "e" });
  };

  return (
    <div className="select-none">
      <div className="relative overflow-hidden rounded-2xl border-[3px] border-[var(--line)] bg-white shadow-inner">
        <canvas
          ref={ref}
          width={W}
          height={H}
          className={`block h-auto w-full touch-none ${canDraw ? "cursor-crosshair" : ""}`}
          style={{ aspectRatio: `${W} / ${H}` }}
          onPointerDown={down}
          onPointerMove={move}
          onPointerUp={up}
          onPointerCancel={up}
        />
      </div>
      {canDraw ? (
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <div className="flex flex-wrap gap-1.5">
            {COLORS.map((c) => (
              <button key={c} type="button" aria-label={`Cor ${c}`} onClick={() => setColor(c)} className={`h-7 w-7 rounded-full border-2 ${color === c ? "scale-110 border-[var(--accent)] ring-2 ring-[var(--accent)]" : "border-[var(--line)]"}`} style={{ background: c }} />
            ))}
          </div>
          <div className="flex items-center gap-1.5">
            {SIZES.map((s) => (
              <button key={s} type="button" aria-label={`Espessura ${s}`} onClick={() => setSize(s)} className={`grid h-8 w-8 place-items-center rounded-full border-2 ${size === s ? "border-[var(--accent)]" : "border-[var(--line)]"}`}>
                <span className="rounded-full bg-[#8a8f98]" style={{ width: Math.max(4, s * 0.7), height: Math.max(4, s * 0.7) }} />
              </button>
            ))}
          </div>
          <div className="ml-auto flex gap-1.5">
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
        </div>
      ) : null}
    </div>
  );
}
