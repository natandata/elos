import Link from "next/link";
import { CardTile } from "@/components/games/CardTile";
import { PageHeader } from "@/components/ui";
import { requireRole } from "@/lib/auth";
import { CARDS } from "@/lib/games/cards";
import { createClient } from "@/lib/supabase/server";

export default async function ColecaoPage() {
  const { profile } = await requireRole("cria", "leader");
  const supabase = await createClient();
  const { data } = await supabase.from("user_cards").select("card_key").eq("user_id", profile.id);
  const owned = new Set(((data ?? []) as { card_key: string }[]).map((r) => r.card_key));
  const pct = Math.round((owned.size / CARDS.length) * 100);

  return (
    <>
      <PageHeader title="🃏 Minha coleção" subtitle="Ganhe cartas no baú do dia, no Quem Sou Eu? e com quiz perfeito." />
      <div className="card mb-5 p-4">
        <div className="flex items-baseline justify-between">
          <span className="text-2xl font-black tabular-nums">
            {owned.size}/{CARDS.length}
          </span>
          <span className="text-sm font-bold text-[var(--muted)]">{pct}% completo</span>
        </div>
        <div className="mt-2 h-3 overflow-hidden rounded-full bg-[var(--bg)]">
          <div className="h-full rounded-full bg-[var(--accent)]" style={{ width: `${pct}%` }} />
        </div>
        <p className="mt-2 text-xs font-semibold text-[var(--muted)]">🃏 10 cartas = selo Colecionador · 20 cartas = selo Mestre das Cartas</p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {CARDS.map((c) => (
          <CardTile key={c.key} card={c} locked={!owned.has(c.key)} />
        ))}
      </div>

      <Link href="/app/jogos" className="btn btn-ghost mt-6 w-full">
        ← Voltar aos jogos
      </Link>
    </>
  );
}
