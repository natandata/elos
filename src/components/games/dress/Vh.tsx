import type { CSSProperties, ReactNode } from "react";

// Peças do visual "jogo mobile premium" do Vista o Herói (palco, título dourado, brilhos, raridade).

const STARS: { x: number; y: number; s: number; d: number }[] = [
  { x: 8, y: 6, s: 14, d: 0 },
  { x: 90, y: 4, s: 11, d: 0.6 },
  { x: 22, y: 18, s: 9, d: 1.2 },
  { x: 76, y: 14, s: 16, d: 0.3 },
  { x: 5, y: 40, s: 10, d: 1.8 },
  { x: 94, y: 34, s: 9, d: 0.9 },
  { x: 14, y: 64, s: 13, d: 2.1 },
  { x: 86, y: 60, s: 12, d: 1.5 },
  { x: 48, y: 3, s: 10, d: 2.4 },
  { x: 30, y: 84, s: 9, d: 0.2 },
  { x: 70, y: 90, s: 14, d: 1 },
  { x: 52, y: 46, s: 8, d: 1.7 },
];

/** Estrelinhas que piscam por trás do conteúdo (posições fixas, sem sorteio). */
export function Sparkles({ count = STARS.length }: { count?: number }) {
  return (
    <div className="vh-sparkles" aria-hidden>
      {STARS.slice(0, count).map((st, i) => (
        <span key={i} className="vh-star" style={{ left: `${st.x}%`, top: `${st.y}%`, fontSize: st.s, animationDelay: `${st.d}s` }}>
          ✦
        </span>
      ))}
    </div>
  );
}

/** Palco com cortinas e brilhos: envolve a tela inteira do jogo. */
export function VhStage({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`vh-stage ${className}`}>
      <Sparkles />
      {children}
    </div>
  );
}

export function VhTitle({ children, className = "text-4xl" }: { children: ReactNode; className?: string }) {
  return <h1 className={`vh-title ${className}`}>{children}</h1>;
}

/** Explosão de estrelinhas (recompensa / peça escolhida). Troque a `key` pra disparar de novo. */
export function SparkleBurst({ n = 12 }: { n?: number }) {
  return (
    <span className="vh-burst" aria-hidden>
      {Array.from({ length: n }).map((_, i) => {
        const a = (i / n) * Math.PI * 2;
        const r = 60 + (i % 3) * 22;
        const style = { "--dx": `${Math.cos(a) * r}px`, "--dy": `${Math.sin(a) * r}px`, fontSize: 10 + (i % 4) * 4, animationDelay: `${(i % 4) * 0.04}s` } as CSSProperties;
        return (
          <i key={i} style={style}>
            ✦
          </i>
        );
      })}
    </span>
  );
}

export { RARITY_ICON, priceOf, rarityOf, type Rarity } from "@/lib/games/dress/rarity";
