import { Card } from "@/components/ui";

export function HojeNoElos({
  daysSinceLastVisit,
  feedPostsToday,
  missionsDueToday,
}: {
  daysSinceLastVisit: number | null;
  feedPostsToday: number;
  missionsDueToday: number;
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
