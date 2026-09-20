import Link from "next/link";

/** Dias entre hoje e a data do evento (Brasília), sem passar por fuso horário
 *  — mesmo truque de "YYYY-MM-DD" + T00:00:00 usado no resto do app. */
function daysUntil(eventDate: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(`${eventDate}T00:00:00`);
  return Math.round((target.getTime() - today.getTime()) / 86_400_000);
}

/**
 * Contagem regressiva pro próximo evento — só reduz visitando o app. Some
 * sozinho se o evento já passou (days < 0) ou se não há próximo evento.
 */
export function EventCountdown({ title, eventDate }: { title: string; eventDate: string }) {
  const days = daysUntil(eventDate);
  if (days < 0) return null;

  const label =
    days === 0 ? (
      <>
        🔥 <strong>{title}</strong> é hoje!
      </>
    ) : days === 1 ? (
      <>
        🔥 Falta <strong>1 dia</strong> pro <strong>{title}</strong>
      </>
    ) : (
      <>
        🔥 Faltam <strong>{days} dias</strong> pro <strong>{title}</strong>
      </>
    );

  return (
    <Link
      href="/app/agenda"
      className="mb-5 flex items-center justify-between gap-3 rounded-2xl bg-[var(--accent-soft)] px-4 py-3 text-sm font-semibold text-[var(--accent-strong)]"
    >
      <span>{label}</span>
      <span aria-hidden>→</span>
    </Link>
  );
}
