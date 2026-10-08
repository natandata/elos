// Datas de aniversário (calendário de Brasília). Sem dependências de servidor.

/** "YYYY-MM-DD" de hoje em Brasília. */
export function todayBrasilia(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
}

function parts(iso: string): [number, number, number] {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  return [y, m, d];
}

const isLeap = (y: number) => (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;

/** Dias até o próximo aniversário (0 = hoje). 29/02 comemora em 28/02 nos anos não bissextos. */
export function daysUntilBirthday(birthIso: string, todayIso = todayBrasilia()): number {
  const [, bm, bd] = parts(birthIso);
  const [ty, tm, td] = parts(todayIso);
  const on = (y: number) => (bm === 2 && bd === 29 && !isLeap(y) ? Date.UTC(y, 1, 28) : Date.UTC(y, bm - 1, bd));
  const today = Date.UTC(ty, tm - 1, td);
  let next = on(ty);
  if (next < today) next = on(ty + 1);
  return Math.round((next - today) / 86_400_000);
}

export function formatBirth(iso: string): string {
  const [y, m, d] = parts(iso);
  return `${String(d).padStart(2, "0")}/${String(m).padStart(2, "0")}/${y}`;
}

/** Texto curto: "é hoje!", "é amanhã", "faltam 12 dias". */
export function untilLabel(days: number): string {
  return days === 0 ? "é hoje!" : days === 1 ? "é amanhã" : `faltam ${days} dias`;
}

/** Data válida para cadastro: entre 5 e 100 anos de idade. */
export function validBirth(iso: string, todayIso = todayBrasilia()): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return false;
  const [y, m, d] = parts(iso);
  const dt = new Date(Date.UTC(y, m - 1, d));
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== m - 1 || dt.getUTCDate() !== d) return false;
  const [ty] = parts(todayIso);
  return iso <= todayIso && ty - y >= 5 && ty - y <= 100;
}
