// Títulos por Bilhetes Dourados (só rótulo, não bloqueia nada). Client-safe.
export const TICKET_TITLES = [
  { min: 0, title: "Aprendiz" },
  { min: 50, title: "Costureiro" },
  { min: 150, title: "Estilista" },
  { min: 400, title: "Alta-Costura" },
  { min: 1000, title: "Lenda da Passarela" },
] as const;

export function ticketTitle(tickets: number): { title: string; next: { min: number; title: string } | null } {
  let idx = 0;
  TICKET_TITLES.forEach((t, i) => {
    if (tickets >= t.min) idx = i;
  });
  return { title: TICKET_TITLES[idx].title, next: TICKET_TITLES[idx + 1] ?? null };
}
