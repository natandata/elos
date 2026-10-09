/**
 * Aparelho fraco: só o modo leve da Arena usa isto. Só vale quando o navegador informa a memória (Chrome/Android, `deviceMemory`).
 * iPhone/iPad (Safari) e Firefox não informam e NUNCA entram no modo leve: contar núcleos errava e deixava iPhones novos com a imagem reduzida.
 */
let cached: boolean | null = null;
export function isLowEnd(): boolean {
  if (cached !== null) return cached;
  if (typeof navigator === "undefined") return false;
  const mem = (navigator as unknown as { deviceMemory?: number }).deviceMemory;
  cached = typeof mem === "number" && mem <= 4;
  return cached;
}
