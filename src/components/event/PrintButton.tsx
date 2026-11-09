"use client";

export function PrintButton() {
  return (
    <button type="button" onClick={() => window.print()} className="rounded-xl bg-[var(--accent,#6d28d9)] px-4 py-2.5 text-sm font-black text-white">
      🖨️ Imprimir / salvar em PDF
    </button>
  );
}
