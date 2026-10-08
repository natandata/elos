"use client";

/** Estrelas para dar a nota (1 a 5). */
export function StarPicker({ value, onPick, disabled }: { value: number; onPick: (n: number) => void; disabled?: boolean }) {
  return (
    <div className="vh-stars" role="radiogroup" aria-label="Nota de 1 a 5 estrelas">
      {[1, 2, 3, 4, 5].map((n) => (
        <button key={n} type="button" role="radio" aria-checked={value === n} aria-label={`${n} estrela${n > 1 ? "s" : ""}`} disabled={disabled} onClick={() => onPick(n)} className="vh-starbtn" data-on={n <= value}>
          ★
        </button>
      ))}
    </div>
  );
}

/** Estrelas só pra mostrar (a média aparece arredondada). */
export function StarsStatic({ value, className = "" }: { value: number; className?: string }) {
  const on = Math.round(value);
  return (
    <span className={`vh-starsm ${className}`} aria-label={`${value.toFixed(1)} de 5 estrelas`}>
      {[1, 2, 3, 4, 5].map((n) => (n <= on ? <b key={n}>★</b> : <span key={n}>★</span>))}
    </span>
  );
}
