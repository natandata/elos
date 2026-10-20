import type { ReactNode } from "react";

// Moldura da Sala de Jogos: fundo de fliperama (estilos .gr-* em globals.css). Só decoração: aria-hidden.

const FLOATERS: { e: string; x: string; s: string; d: string; dl: string }[] = [
  { e: "🎮", x: "6%", s: "34px", d: "19s", dl: "-3s" },
  { e: "⚔️", x: "17%", s: "26px", d: "23s", dl: "-11s" },
  { e: "🏰", x: "29%", s: "30px", d: "21s", dl: "-17s" },
  { e: "⚽", x: "41%", s: "28px", d: "25s", dl: "-6s" },
  { e: "🃏", x: "52%", s: "32px", d: "20s", dl: "-14s" },
  { e: "⛏️", x: "63%", s: "26px", d: "24s", dl: "-1s" },
  { e: "🛶", x: "74%", s: "30px", d: "22s", dl: "-9s" },
  { e: "🎨", x: "84%", s: "28px", d: "26s", dl: "-19s" },
  { e: "📖", x: "92%", s: "32px", d: "18s", dl: "-7s" },
  { e: "🧠", x: "12%", s: "24px", d: "27s", dl: "-21s" },
  { e: "⭐", x: "47%", s: "22px", d: "17s", dl: "-12s" },
  { e: "🏆", x: "78%", s: "26px", d: "28s", dl: "-5s" },
];

export function RoomBackdrop({ children }: { children: ReactNode }) {
  return (
    <div className="gr-room">
      <div className="gr-bg" aria-hidden>
        <div className="gr-stars" />
        <div className="gr-stars2" />
        {FLOATERS.map((f) => (
          <span key={f.e + f.x} className="gr-f" style={{ ["--x" as string]: f.x, ["--s" as string]: f.s, ["--d" as string]: f.d, ["--dl" as string]: f.dl }}>
            {f.e}
          </span>
        ))}
        <div className="gr-floor" />
      </div>
      <div className="gr-content">{children}</div>
    </div>
  );
}
