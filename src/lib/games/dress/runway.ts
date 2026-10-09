// Validação do look em montagem (SÓ SERVIDOR).
import "server-only";
import { MODERN_FAMILIES, ITEM_BY_ID, SLOTS, type Look, type Slot } from "./items";
import { priceOf } from "./rarity";

/**
 * Look em montagem (sala ao vivo): só entram peças do catálogo, no espaço certo; o que vier estranho é ignorado.
 * A roupa é obrigatória: sem ela, entra a túnica simples (a modelo nunca desfila sem roupa).
 * `owned`: famílias raras que a jogadora comprou; peça rara que ela não tem é tirada do look (null = não confere).
 */
export function cleanDraftLook(raw: unknown, owned: Set<string> | null = null): Look {
  const out: Look = {};
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  for (const s of SLOTS) {
    const id = r[s.key];
    const item = typeof id === "string" ? ITEM_BY_ID.get(id) : undefined;
    if (!item || item.slot !== s.key || MODERN_FAMILIES.has(item.family)) continue;
    if (owned && priceOf(item.family) > 0 && !owned.has(item.family)) continue;
    out[s.key as Slot] = item.id;
  }
  if (!out.tunic && ITEM_BY_ID.has("tunic_simple")) out.tunic = "tunic_simple";
  return out;
}
