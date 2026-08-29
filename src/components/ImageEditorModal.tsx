"use client";

import { useEffect, useRef, useState } from "react";

/** Resolução de exportação — boa qualidade sem exagerar no arquivo final
 *  (o compressImage() ainda roda em cima disso antes do upload). */
const OUT_W = 720;

type Props = {
  file: File;
  /** largura / altura desejada do recorte final. */
  aspect: number;
  onCancel: () => void;
  onApply: (blob: Blob) => void;
};

/** Editor simples de imagem: girar em passos de 90°, zoom e arrastar pra
 *  reenquadrar, antes de subir a foto. Tudo feito com canvas puro (sem lib
 *  nova) pra manter o bundle enxuto. */
export function ImageEditorModal({ file, aspect, onCancel, onApply }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [rotation, setRotation] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const dragRef = useRef<{ x: number; y: number } | null>(null);

  const outH = Math.round(OUT_W / aspect);

  useEffect(() => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => setImg(image);
    image.src = url;
    return () => URL.revokeObjectURL(url);
  }, [file]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !img) return;
    canvas.width = OUT_W;
    canvas.height = outH;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, OUT_W, outH);
    ctx.save();
    ctx.translate(OUT_W / 2 + pan.x, outH / 2 + pan.y);
    ctx.rotate((rotation * Math.PI) / 180);

    const rotated90 = rotation % 180 !== 0;
    const effW = rotated90 ? img.naturalHeight : img.naturalWidth;
    const effH = rotated90 ? img.naturalWidth : img.naturalHeight;
    const coverScale = Math.max(OUT_W / effW, outH / effH) * zoom;

    ctx.scale(coverScale, coverScale);
    ctx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2);
    ctx.restore();
  }, [img, rotation, zoom, pan, outH]);

  function toCanvasPoint(clientX: number, clientY: number) {
    const rect = canvasRef.current!.getBoundingClientRect();
    const scale = OUT_W / rect.width;
    return { x: clientX * scale, y: clientY * scale };
  }

  function handlePointerDown(e: React.PointerEvent<HTMLCanvasElement>) {
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = { x: e.clientX, y: e.clientY };
  }

  function handlePointerMove(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!dragRef.current) return;
    const start = toCanvasPoint(dragRef.current.x, dragRef.current.y);
    const now = toCanvasPoint(e.clientX, e.clientY);
    setPan((p) => ({ x: p.x + (now.x - start.x), y: p.y + (now.y - start.y) }));
    dragRef.current = { x: e.clientX, y: e.clientY };
  }

  function handlePointerUp() {
    dragRef.current = null;
  }

  function apply() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.toBlob(
      (blob) => {
        if (blob) onApply(blob);
      },
      "image/jpeg",
      0.92,
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-[var(--card)] p-4 shadow-lg">
        <p className="mb-3 text-sm font-bold text-[var(--ink)]">Ajustar imagem</p>

        <div
          className="mx-auto overflow-hidden rounded-lg bg-black/10"
          style={{ width: "100%", maxWidth: 288, aspectRatio: String(aspect) }}
        >
          <canvas
            ref={canvasRef}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerUp}
            className="h-full w-full touch-none"
            style={{ cursor: "grab" }}
          />
        </div>
        <p className="mt-2 text-center text-xs text-[var(--muted)]">Arraste pra reenquadrar</p>

        <div className="mt-3 flex items-center justify-center gap-2">
          <button
            type="button"
            onClick={() => setRotation((r) => (r + 270) % 360)}
            className="rounded-full border border-[var(--line)] px-3 py-1.5 text-sm"
          >
            ↺ Girar
          </button>
          <button
            type="button"
            onClick={() => setRotation((r) => (r + 90) % 360)}
            className="rounded-full border border-[var(--line)] px-3 py-1.5 text-sm"
          >
            ↻ Girar
          </button>
        </div>

        <div className="mt-3">
          <label className="text-xs text-[var(--muted)]">Zoom</label>
          <input
            type="range"
            min={1}
            max={3}
            step={0.01}
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            className="w-full"
          />
        </div>

        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 rounded-full border border-[var(--line)] py-2 text-sm font-semibold"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={apply}
            className="flex-1 rounded-full bg-[var(--accent)] py-2 text-sm font-semibold text-[var(--accent-ink)]"
          >
            Aplicar
          </button>
        </div>
      </div>
    </div>
  );
}
