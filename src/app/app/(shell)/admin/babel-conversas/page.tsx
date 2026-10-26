import { LeaderCallRow, type CallRow } from "@/components/admin/LeaderCallRow";
import { EmptyState, PageHeader } from "@/components/ui";
import { requireRole } from "@/lib/auth";
import type { CallStatus, LeaderId } from "@/lib/babel/leaders";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Conversas do Babel" };

export default async function BabelConversasPage() {
  await requireRole("admin");
  const supabase = await createClient();
  const { data } = await supabase.from("babel_leader_calls").select("id, user_id, leader, note, status, scheduled_at, link, created_at").order("created_at", { ascending: false }).limit(100);
  const rows = (data ?? []) as { id: string; user_id: string; leader: LeaderId; note: string | null; status: CallStatus; scheduled_at: string | null; link: string | null; created_at: string }[];
  const ids = [...new Set(rows.map((r) => r.user_id))];
  const { data: profs } = ids.length ? await supabase.from("profiles").select("id, first_name, full_name").in("id", ids) : { data: [] };
  const names = new Map(((profs ?? []) as { id: string; first_name: string | null; full_name: string | null }[]).map((p) => [p.id, p.full_name || p.first_name || "Cria"]));
  const list: CallRow[] = rows.map((r) => ({ id: r.id, name: names.get(r.user_id) ?? "Cria", leader: r.leader, status: r.status, note: r.note, scheduledAt: r.scheduled_at, link: r.link, createdAt: r.created_at }));
  const open = list.filter((c) => c.status === "requested" || c.status === "scheduled");
  const past = list.filter((c) => !open.includes(c));

  return (
    <div className="space-y-6">
      <PageHeader title="Conversas do Babel" subtitle="Quem terminou a trilha de inglês e pediu a conversa de 10 minutos com o Natan ou a Rebeca." />
      <section className="space-y-3">
        <h2 className="text-lg font-extrabold">Em aberto ({open.length})</h2>
        {open.length ? open.map((c) => <LeaderCallRow key={c.id} c={c} />) : <EmptyState>Nenhum pedido em aberto. Os pedidos aparecem aqui (e no sino) quando alguém concluir a trilha.</EmptyState>}
      </section>
      {past.length ? (
        <section className="space-y-3">
          <h2 className="text-lg font-extrabold">Histórico</h2>
          {past.map((c) => (
            <LeaderCallRow key={c.id} c={c} />
          ))}
        </section>
      ) : null}
    </div>
  );
}
