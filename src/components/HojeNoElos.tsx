import { GradientCard, SoftTile, type SOFT } from "@/components/home/GradientCard";

type Stat = {
  key: string;
  emoji: string;
  value: number;
  label: string;
  tone: keyof typeof SOFT;
};

export function HojeNoElos({
  daysSinceLastVisit,
  feedPostsToday,
  missionsDueToday,
  statusAnswered,
  statusTotal,
  onlineNow,
}: {
  daysSinceLastVisit: number | null;
  feedPostsToday: number;
  missionsDueToday: number;
  /** Quantos do Elo já responderam o status hoje, de quantos no total —
   *  omitido (undefined) quando não há Elo pra contar. */
  statusAnswered?: number;
  statusTotal?: number;
  /** Quantos do Elo estão com atividade recente (últimos 5 min). */
  onlineNow?: number;
}) {
  const returning = daysSinceLastVisit !== null && daysSinceLastVisit >= 3;

  // Cards quadrados em vez de uma lista de frases — cada estatística vira um
  // bloco próprio (emoji grande, número grande, legenda curta) pra ler de
  // relance, não precisar ler frase por frase.
  const stats: Stat[] = [];
  if (typeof onlineNow === "number" && onlineNow > 0) {
    stats.push({
      key: "online",
      emoji: "🟢",
      value: onlineNow,
      label: onlineNow === 1 ? "online agora" : "online agora",
      tone: "green",
    });
  }
  if (typeof statusAnswered === "number" && typeof statusTotal === "number" && statusTotal > 0) {
    stats.push({
      key: "status",
      emoji: "💛",
      value: statusAnswered,
      label: `de ${statusTotal} no status`,
      tone: "yellow",
    });
  }
  stats.push({
    key: "feed",
    emoji: "📸",
    value: feedPostsToday,
    label: feedPostsToday === 1 ? "foto nova" : "fotos novas",
    tone: "pink",
  });
  stats.push({
    key: "missions",
    emoji: "🎯",
    value: missionsDueToday,
    label: missionsDueToday === 1 ? "missão vence hoje" : "missões vencem hoje",
    tone: "peach",
  });

  return (
    <GradientCard tone="sunrise" title={returning ? "Sentimos sua falta! 👋" : "Hoje no ELOS"}>
      {returning ? (
        <p className="-mt-1 mb-3 text-sm text-[var(--muted)]">
          Faz {daysSinceLastVisit} dias que você não aparecia por aqui. Olha o que rolou:
        </p>
      ) : null}
      <div className="grid grid-cols-2 gap-2.5">
        {stats.map((s) => (
          <SoftTile key={s.key} tone={s.tone} icon={s.emoji}>
            <p className="text-2xl" aria-hidden>
              {s.emoji}
            </p>
            <p className="mt-1 text-3xl font-black tabular-nums leading-none">{s.value}</p>
            <p className="mt-1 text-xs font-bold text-[#4a3f66]">{s.label}</p>
          </SoftTile>
        ))}
      </div>
    </GradientCard>
  );
}
