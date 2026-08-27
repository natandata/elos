import type { StatusLevel } from "@/lib/types";

const LEVEL_Y: Record<StatusLevel, number> = { bad: 2, ok: 1, good: 0 };
const LEVEL_COLOR: Record<StatusLevel, string> = {
  bad: "#dc2626",
  ok: "#d97706",
  good: "#059669",
};

type Point = { created_at: string; emotional_status: StatusLevel; spiritual_status: StatusLevel };

/** Sparkline simples (sem libs) do histórico emocional/espiritual do cria. */
export function StatusHistoryChart({ history }: { history: Point[] }) {
  if (history.length < 2) return null;

  // do mais antigo para o mais novo, da esquerda pra direita
  const ordered = [...history].reverse();
  const w = 100;
  const h = 36;
  const stepX = w / (ordered.length - 1);
  const yFor = (level: StatusLevel) => 4 + (LEVEL_Y[level] / 2) * (h - 8);

  const line = (key: "emotional_status" | "spiritual_status") =>
    ordered.map((p, i) => `${i === 0 ? "M" : "L"}${(i * stepX).toFixed(1)},${yFor(p[key]).toFixed(1)}`).join(" ");

  return (
    <div className="mt-2">
      <svg viewBox={`0 0 ${w} ${h}`} className="h-9 w-full" preserveAspectRatio="none">
        <path d={line("spiritual_status")} fill="none" stroke="var(--accent)" strokeWidth={1.5} opacity={0.55} />
        <path d={line("emotional_status")} fill="none" stroke="var(--ink)" strokeWidth={1.5} />
        {ordered.map((p, i) => (
          <circle
            key={i}
            cx={i * stepX}
            cy={yFor(p.emotional_status)}
            r={1.6}
            fill={LEVEL_COLOR[p.emotional_status]}
          />
        ))}
      </svg>
      <p className="mt-1 text-[10px] text-[var(--muted)]">
        <span className="font-semibold text-[var(--ink)]">━</span> emocional ·{" "}
        <span className="font-semibold text-[var(--accent)]">━</span> espiritual · últimas{" "}
        {ordered.length} respostas
      </p>
    </div>
  );
}
