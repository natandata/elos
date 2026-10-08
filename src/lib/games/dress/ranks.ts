// Títulos por Bilhetes Dourados (só rótulo, não bloqueia nada). Client-safe.
export const TICKET_TITLES = [
  { min: 0, title: "Peregrina" },
  { min: 50, title: "Pastora" },
  { min: 150, title: "Escriba" },
  { min: 400, title: "Discípula" },
  { min: 800, title: "Mestra das Vestes" },
  { min: 1500, title: "Conhecedora das Escrituras" },
] as const;

export function ticketTitle(tickets: number): { title: string; next: { min: number; title: string } | null } {
  let idx = 0;
  TICKET_TITLES.forEach((t, i) => {
    if (tickets >= t.min) idx = i;
  });
  return { title: TICKET_TITLES[idx].title, next: TICKET_TITLES[idx + 1] ?? null };
}
