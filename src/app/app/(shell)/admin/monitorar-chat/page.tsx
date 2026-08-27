import Link from "next/link";
import { Card, EmptyState, PageHeader } from "@/components/ui";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatDateTime } from "@/lib/types";

export default async function MonitorarChatPage() {
  await requireRole("admin");
  const supabase = await createClient();

  const { data: elos } = await supabase.from("elos").select("id, name").order("name");

  const { data: lastMessages } = await supabase
    .from("chat_messages")
    .select("elo_id, created_at")
    .order("created_at", { ascending: false });

  const lastByElo = new Map<string, string>();
  (lastMessages ?? []).forEach((m) => {
    if (!lastByElo.has(m.elo_id)) lastByElo.set(m.elo_id, m.created_at);
  });

  return (
    <>
      <PageHeader title="Monitorar Chat" subtitle="Acompanhe as conversas de todos os Elos." />

      {!elos || elos.length === 0 ? (
        <EmptyState>Nenhum Elo cadastrado ainda.</EmptyState>
      ) : (
        <div className="space-y-3">
          {elos.map((elo) => {
            const last = lastByElo.get(elo.id);
            return (
              <Link key={elo.id} href={`/app/admin/monitorar-chat/${elo.id}`} className="block">
                <Card className="flex items-center justify-between gap-3 transition hover:-translate-y-0.5">
                  <div>
                    <p className="font-bold">{elo.name}</p>
                    <p className="text-xs text-[var(--muted)]">
                      {last ? `Última mensagem em ${formatDateTime(last)}` : "Sem mensagens ainda"}
                    </p>
                  </div>
                  <span className="text-[var(--muted)]">→</span>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </>
  );
}
