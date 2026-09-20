import Link from "next/link";
import { Card, EmptyState, PageHeader } from "@/components/ui";
import { Avatar } from "@/components/Avatar";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatDateTime } from "@/lib/types";

export default async function AdminAjudaPage() {
  await requireRole("admin");
  const supabase = await createClient();

  const { data: lastMessages } = await supabase
    .from("help_chat_messages")
    .select("cria_id, body, created_at")
    .order("created_at", { ascending: false });

  const lastByCria = new Map<string, { body: string; created_at: string }>();
  (lastMessages ?? []).forEach((m) => {
    if (!lastByCria.has(m.cria_id)) lastByCria.set(m.cria_id, { body: m.body, created_at: m.created_at });
  });

  const criaIds = Array.from(lastByCria.keys());
  const { data: crias } = criaIds.length
    ? await supabase
        .from("profiles")
        .select("id, full_name, avatar_url, elos:elo_id(name)")
        .in("id", criaIds)
    : { data: [] };

  const criaById = new Map(
    ((crias ?? []) as unknown as { id: string; full_name: string; avatar_url: string | null; elos: { name: string } | null }[]).map(
      (c) => [c.id, c],
    ),
  );

  const sorted = criaIds.slice().sort((a, b) => {
    const ta = lastByCria.get(a)?.created_at ?? "";
    const tb = lastByCria.get(b)?.created_at ?? "";
    return tb.localeCompare(ta);
  });

  return (
    <>
      <PageHeader title="Pedidos de Ajuda" subtitle="Conversas individuais entre cada cria e seu líder." />
      {sorted.length === 0 ? (
        <EmptyState>Nenhuma conversa de ajuda ainda.</EmptyState>
      ) : (
        <div className="space-y-2">
          {sorted.map((criaId) => {
            const cria = criaById.get(criaId);
            const last = lastByCria.get(criaId)!;
            return (
              <Link key={criaId} href={`/app/admin/ajuda/${criaId}`} className="block">
                <Card className="flex items-center gap-3 transition hover:-translate-y-0.5">
                  <Avatar url={cria?.avatar_url ?? null} name={cria?.full_name} size={36} />
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold">
                      {cria?.full_name || "Sem nome"}
                      {cria?.elos?.name ? (
                        <span className="ml-2 text-xs font-normal text-[var(--muted)]">
                          {cria.elos.name}
                        </span>
                      ) : null}
                    </p>
                    <p className="truncate text-xs text-[var(--muted)]">
                      {last.body} · {formatDateTime(last.created_at)}
                    </p>
                  </div>
                  <span className="text-[var(--muted)]" aria-hidden>
                    →
                  </span>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </>
  );
}
