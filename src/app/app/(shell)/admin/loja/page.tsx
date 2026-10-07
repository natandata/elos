import { CoinGrant, type CoinUser } from "@/components/games/CoinGrant";
import { XpRateAdmin } from "@/components/games/XpRateAdmin";
import { StoreManager } from "@/components/games/StoreManager";
import { PageHeader } from "@/components/ui";
import { requireRole } from "@/lib/auth";
import { STORE_COLUMNS, type StoreItem } from "@/lib/games/store";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export default async function AdminLojaPage() {
  await requireRole("admin");
  const supabase = await createClient();
  const { data } = await supabase.from("store_items").select(STORE_COLUMNS).order("sort").order("created_at");

  const { data: setting } = await supabase.from("coin_settings").select("xp_per_coin").eq("id", 1).maybeSingle<{ xp_per_coin: number }>();
  let users: CoinUser[] = [];
  const db = createAdminClient();
  if (db) {
    const [{ data: profs }, { data: wallets }] = await Promise.all([
      db.from("profiles").select("id, full_name, elos(name)").in("role", ["cria", "leader"]).eq("is_test_account", false).order("full_name").limit(1000),
      db.from("coin_wallets").select("user_id, balance"),
    ]);
    const bal = new Map(((wallets ?? []) as { user_id: string; balance: number }[]).map((w) => [w.user_id, w.balance]));
    users = ((profs ?? []) as unknown as { id: string; full_name: string | null; elos: { name: string } | { name: string }[] | null }[]).map((p) => ({
      id: p.id,
      name: p.full_name || "Sem nome",
      elo: (Array.isArray(p.elos) ? p.elos[0]?.name : p.elos?.name) ?? null,
      balance: bal.get(p.id) ?? 0,
    }));
  }

  return (
    <>
      <PageHeader title="🛍️ Loja da Sala de Jogos" subtitle="Escolha quais jogos aparecem na vitrine, com data de lançamento ou em produção, e defina o preço em denários." />
      <StoreManager items={(data ?? []) as StoreItem[]} />
      <h2 className="mb-2 mt-6 text-sm font-bold uppercase tracking-wide text-[var(--muted)]">Troca de XP</h2>
      <XpRateAdmin rate={setting?.xp_per_coin ?? 10} />
      <h2 className="mb-2 mt-6 text-sm font-bold uppercase tracking-wide text-[var(--muted)]">Denários dos jogadores</h2>
      <CoinGrant users={users} />
    </>
  );
}
