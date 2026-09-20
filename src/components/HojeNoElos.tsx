import { Card } from "@/components/ui";

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

  return (
    <Card className="mb-5">
      <h2 className="mb-2 text-sm font-bold">
        {returning ? "Sentimos sua falta! 👋" : "Hoje no ELOS"}
      </h2>
      {returning ? (
        <p className="mb-2 text-sm text-[var(--muted)]">
          Faz {daysSinceLastVisit} dias que você não aparecia por aqui. Olha o que rolou:
        </p>
      ) : null}
      <ul className="space-y-1 text-sm text-[var(--muted)]">
        {typeof onlineNow === "number" && onlineNow > 0 ? (
          <li>
            <span className="live-dot inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />{" "}
            <strong className="text-[var(--ink)]">{onlineNow}</strong>{" "}
            {onlineNow === 1 ? "pessoa do seu Elo está" : "pessoas do seu Elo estão"} online agora
          </li>
        ) : null}
        {typeof statusAnswered === "number" && typeof statusTotal === "number" && statusTotal > 0 ? (
          <li>
            💛 <strong className="text-[var(--ink)]">{statusAnswered}</strong> de{" "}
            <strong className="text-[var(--ink)]">{statusTotal}</strong> do seu Elo já responderam o
            status hoje
          </li>
        ) : null}
        <li>
          📸 <strong className="text-[var(--ink)]">{feedPostsToday}</strong>{" "}
          {feedPostsToday === 1 ? "foto nova" : "fotos novas"} no Explorar nas últimas 24h
        </li>
        <li>
          🎯 <strong className="text-[var(--ink)]">{missionsDueToday}</strong>{" "}
          {missionsDueToday === 1 ? "missão vence" : "missões vencem"} hoje
        </li>
      </ul>
    </Card>
  );
}
