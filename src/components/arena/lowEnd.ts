/** Aparelho fraco (pouca memória ou poucos núcleos): só nele a Arena usa o modo leve. Os outros ficam com tudo como sempre. */
let cached: boolean | null = null;
export function isLowEnd(): boolean {
  if (cached !== null) return cached;
  if (typeof navigator === "undefined") return false;
  const n = navigator as unknown as { deviceMemory?: number; hardwareConcurrency?: number };
  // deviceMemory não existe no iPhone/Firefox: nesses vale o número de núcleos
  cached = n.deviceMemory !== undefined ? n.deviceMemory <= 4 : (n.hardwareConcurrency ?? 8) <= 4;
  return cached;
}
