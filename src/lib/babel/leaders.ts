// Último nível do Babel: conversa de 10 minutos com um líder. Dados puros (client-safe).

export type LeaderId = "natan" | "rebeca";
export const CALL_MINUTES = 10;
export const CALL_GEMS = 300;

export const LEADERS: Record<LeaderId, { name: string; article: string; blurb: string }> = {
  natan: { name: "Natan", article: "o Natan", blurb: "Conversa descontraída sobre o seu dia, a escola e os seus planos." },
  rebeca: { name: "Rebeca", article: "a Rebeca", blurb: "Conversa descontraída sobre sua rotina, seus gostos e sua fé." },
};

export type CallStatus = "requested" | "scheduled" | "done" | "cancelled";
export type LeaderCall = { id: string; leader: LeaderId; status: CallStatus; scheduledAt: string | null; link: string | null; note: string | null };

/** Só aceita endereço http(s) como link da chamada. */
export function safeLink(raw: string | null | undefined): string | null {
  const v = (raw ?? "").trim();
  if (!v) return null;
  try {
    const u = new URL(v);
    return u.protocol === "https:" || u.protocol === "http:" ? u.toString() : null;
  } catch {
    return null;
  }
}

/** `datetime-local` (horário de Brasília) -> instante ISO. */
export function brLocalToIso(v: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(v)) return null;
  const t = Date.parse(`${v}:00-03:00`);
  return Number.isNaN(t) ? null : new Date(t).toISOString();
}
