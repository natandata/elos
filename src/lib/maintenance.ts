// Calendário da manutenção do ELOS (horário de Brasília, UTC-3, sem horário de verão).
/** 21/11/2026 00h00 em Brasília: o aviso passa a aparecer para todos. */
export const MAINTENANCE_NOTICE_AT = Date.UTC(2026, 10, 21, 3, 0, 0);
/** 27/11/2026 00h00 em Brasília: o aplicativo fecha para manutenção (ninguém entra mais, o login vira a tela de manutenção). */
export const MAINTENANCE_START_AT = Date.UTC(2026, 10, 27, 3, 0, 0);

export const isMaintenance = (now = Date.now()): boolean => now >= MAINTENANCE_START_AT;
export const isNoticeTime = (now = Date.now()): boolean => now >= MAINTENANCE_NOTICE_AT && now < MAINTENANCE_START_AT;
