import { GradientCard } from "@/components/home/GradientCard";

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
        <strong>{title}</strong> é hoje!
      </>
    ) : days === 1 ? (
      <>
        Falta <strong>1 dia</strong> pro <strong>{title}</strong>
      </>
    ) : (
      <>
        Faltam <strong>{days} dias</strong> pro <strong>{title}</strong>
      </>
    );

  return (
    <GradientCard tone="aurora" href="/app/agenda" ariaLabel="Próximo evento">
      <div className="flex items-center justify-between gap-3 text-base font-bold">
        <span className="flex items-center gap-2">
          <span className="text-xl" aria-hidden>
            🔥
          </span>
          <span>{label}</span>
        </span>
        <span className="text-xl text-[var(--accent-strong)]" aria-hidden>
          →
        </span>
      </div>
    </GradientCard>
  );
}
