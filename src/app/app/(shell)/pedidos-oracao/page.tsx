import { Card, EmptyState, PageHeader } from "@/components/ui";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/types";

type Row = {
  id: string;
  cria_first_name: string;
  elo_name: string | null;
  title: string;
  is_answered: boolean;
  created_at: string;
};

/** Pedidos de oração compartilhados com o Elo, de todos os ELOS — tela do
 *  modo responsável (só leitura). Só o primeiro nome do cria, nunca o
 *  sobrenome (ver guardian_prayer_requests()). */
export default async function PedidosOracaoPage() {
  await requireRole("guardian");
  const supabase = await createClient();

  const { data } = await supabase.rpc("guardian_prayer_requests");
  const prayers = (data ?? []) as Row[];

  return (
    <>
      <PageHeader title="Pedidos de Oração" subtitle="Compartilhados com o Elo — todos os ELOS juntos." />

      {prayers.length === 0 ? (
        <EmptyState>Nenhum pedido de oração compartilhado ainda.</EmptyState>
      ) : (
        <div className="space-y-3">
          {prayers.map((p) => (
            <Card key={p.id}>
              <div className="flex items-start justify-between gap-2">
                <p className={`text-sm ${p.is_answered ? "text-emerald-800 line-through" : ""}`}>
                  {p.title}
                </p>
                {p.is_answered ? (
                  <span className="chip shrink-0 border-emerald-200 bg-emerald-100 text-emerald-800">
                    Respondido
                  </span>
                ) : null}
              </div>
              <p className="mt-1 text-xs text-[var(--muted)]">
                {p.cria_first_name || "Alguém"} · {p.elo_name ?? "Sem Elo"} · {formatDate(p.created_at)}
              </p>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
