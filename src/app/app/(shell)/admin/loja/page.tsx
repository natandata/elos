import { StoreManager } from "@/components/games/StoreManager";
import { PageHeader } from "@/components/ui";
import { requireRole } from "@/lib/auth";
import { STORE_COLUMNS, type StoreItem } from "@/lib/games/store";
import { createClient } from "@/lib/supabase/server";

export default async function AdminLojaPage() {
  await requireRole("admin");
  const supabase = await createClient();
  const { data } = await supabase.from("store_items").select(STORE_COLUMNS).order("sort").order("created_at");
  return (
    <>
      <PageHeader title="🛍️ Loja da Sala de Jogos" subtitle="Escolha quais jogos aparecem na vitrine: com data de lançamento (contagem regressiva) ou em produção." />
      <StoreManager items={(data ?? []) as StoreItem[]} />
    </>
  );
}
