"use client";

import { useMemo, useRef, useState } from "react";

const VIEWPORT = 260;
const OUTPUT = 512;

type Point = { x: number; y: number };

/**
 * Recorte simples de avatar: sem biblioteca externa, só arraste pra
 * posicionar e um slider pra dar zoom, dentro de um círculo — assim a foto
 * nunca sai cortada do jeito errado, quem sobe a foto escolhe o enquadramento.
 */
export function AvatarCropModal({
  file,
  onCancel,
  onConfirm,
}: {
  file: File;
  onCancel: () => void;
  onConfirm: (blob: Blob) => void;
}) {
  const imgSrc = useMemo(() => URL.createObjectURL(file), [file]);
  const imgRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [natural, setNatural] = useState<{ w: number; h: number } | null>(null);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState<Point>({ x: 0, y: 0 });
  const dragRef = useRef<{ start: Point; startOffset: Point } | null>(null);
  const [busy, setBusy] = useState(false);

  const baseScale = natural ? Math.max(VIEWPORT / natural.w, VIEWPORT / natural.h) : 1;
  const scale = baseScale * zoom;
  const dispW = natural ? natural.w * scale : VIEWPORT;
  const dispH = natural ? natural.h * scale : VIEWPORT;

  function clamp(next: Point, currentScale = scale) {
    const w = natural ? natural.w * currentScale : VIEWPORT;
    const h = natural ? natural.h * currentScale : VIEWPORT;
    const maxX = Math.max(0, (w - VIEWPORT) / 2);
    const maxY = Math.max(0, (h - VIEWPORT) / 2);
    return {
      x: Math.min(maxX, Math.max(-maxX, next.x)),
      y: Math.min(maxY, Math.max(-maxY, next.y)),
    };
  }

  function handlePointerDown(e: React.PointerEvent) {
    (e.target as Element).setPointerCapture(e.pointerId);
    dragRef.current = { start: { x: e.clientX, y: e.clientY }, startOffset: offset };
  }

  function handlePointerMove(e: React.PointerEvent) {
    if (!dragRef.current) return;
    const dx = e.clientX - dragRef.current.start.x;
    const dy = e.clientY - dragRef.current.start.y;
    setOffset(clamp({ x: dragRef.current.startOffset.x + dx, y: dragRef.current.startOffset.y + dy }));
  }

  function handlePointerUp() {
    dragRef.current = null;
  }

  function handleZoom(value: number) {
    setZoom(value);
    setOffset((prev) => clamp(prev, baseScale * value));
  }

  async function confirm() {
    if (!natural || !imgRef.current) return;
    setBusy(true);

    const canvas = document.createElement("canvas");
    canvas.width = OUTPUT;
    canvas.height = OUTPUT;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      setBusy(false);
      return;
    }

    // canto superior-esquerdo da imagem exibida, em coordenadas do viewport
    const imgLeft = (VIEWPORT - dispW) / 2 + offset.x;
    const imgTop = (VIEWPORT - dispH) / 2 + offset.y;

    // mapeia o viewport (0..VIEWPORT) de volta pra pixels da imagem original
    const sx = (0 - imgLeft) / scale;
    const sy = (0 - imgTop) / scale;
    const sSize = VIEWPORT / scale;

    ctx.drawImage(imgRef.current, sx, sy, sSize, sSize, 0, 0, OUTPUT, OUTPUT);

    canvas.toBlob(
      (blob) => {
        setBusy(false);
        if (blob) onConfirm(blob);
      },
      "image/jpeg",
      0.9,
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="card w-full max-w-xs p-4">
        <p className="mb-3 text-center font-bold">Ajustar foto</p>

        <div
          ref={containerRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
          className="relative mx-auto touch-none overflow-hidden rounded-full bg-[var(--bg)]"
          style={{ width: VIEWPORT, height: VIEWPORT, cursor: "grab" }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            ref={imgRef}
            src={imgSrc}
            alt=""
            draggable={false}
            onLoad={(e) => {
              const el = e.currentTarget;
              setNatural({ w: el.naturalWidth, h: el.naturalHeight });
            }}
            className="absolute select-none"
            style={{
              width: dispW,
              height: dispH,
              left: (VIEWPORT - dispW) / 2 + offset.x,
              top: (VIEWPORT - dispH) / 2 + offset.y,
              maxWidth: "none",
            }}
          />
        </div>

        <p className="mt-3 text-center text-xs text-[var(--muted)]">Arraste pra posicionar</p>

        <div className="mt-3 flex items-center gap-2">
          <span className="text-xs text-[var(--muted)]" aria-hidden>
            −
          </span>
          <input
            type="range"
            min={1}
            max={3}
            step={0.05}
            value={zoom}
            onChange={(e) => handleZoom(Number(e.target.value))}
            className="w-full"
          />
          <span className="text-xs text-[var(--muted)]" aria-hidden>
            +
          </span>
        </div>

        <div className="mt-4 flex gap-2">
          <button type="button" onClick={confirm} disabled={busy || !natural} className="btn btn-primary flex-1 !py-2 !text-sm">
            {busy ? "Salvando…" : "Usar essa foto"}
          </button>
          <button type="button" onClick={onCancel} className="btn btn-ghost !py-2 !text-sm">
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}
