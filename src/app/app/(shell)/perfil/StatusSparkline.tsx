const LEVEL_Y: Record<string, number> = { bad: 2, ok: 1, good: 0 };
const LEVEL_COLOR: Record<string, string> = { bad: "#ef4444", ok: "#f59e0b", good: "#22c55e" };

type Point = { emotional_status: string; spiritual_status: string; created_at: string };

/** Sparkline simples (sem lib externa) do humor emocional/espiritual recente. */
export function StatusSparkline({ points }: { points: Point[] }) {
  if (points.length === 0) {
    return <p className="text-sm text-[var(--muted)]">Ainda sem respostas registradas.</p>;
  }

  const ordered = [...points].reverse(); // mais antigo → mais recente
  const w = 280;
  const h = 60;
  const stepX = ordered.length > 1 ? w / (ordered.length - 1) : 0;
  const yFor = (level: string) => 8 + (LEVEL_Y[level] ?? 1) * ((h - 16) / 2);

  const lineFor = (key: "emotional_status" | "spiritual_status") =>
    ordered.map((p, i) => `${i === 0 ? "M" : "L"} ${i * stepX} ${yFor(p[key])}`).join(" ");

  return (
    <div>
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full" role="img" aria-label="Histórico de humor">
        <path d={lineFor("emotional_status")} fill="none" stroke="var(--accent)" strokeWidth={2} />
        <path
          d={lineFor("spiritual_status")}
          fill="none"
          stroke="var(--muted)"
          strokeWidth={2}
          strokeDasharray="4 3"
        />
        {ordered.map((p, i) => (
          <circle
            key={`e-${i}`}
            cx={i * stepX}
            cy={yFor(p.emotional_status)}
            r={3}
            fill={LEVEL_COLOR[p.emotional_status] ?? "var(--accent)"}
          />
        ))}
      </svg>
      <div className="mt-1 flex items-center gap-4 text-xs text-[var(--muted)]">
        <span className="flex items-center gap-1">
          <span className="inline-block h-0.5 w-3 bg-[var(--accent)]" /> Emocional
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-0.5 w-3 bg-[var(--muted)]" style={{ borderTop: "2px dashed" }} />
          Espiritual
        </span>
      </div>
    </div>
  );
}
