import { Card, EmptyState, PageHeader } from "@/components/ui";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatDateTime } from "@/lib/types";

const ACTION_LABEL: Record<string, string> = {
  profile_update: "Alteração de perfil",
  profile_delete: "Exclusão de usuário",
};

export default async function AuditoriaPage() {
  await requireRole("admin");
  const supabase = await createClient();

  const { data } = await supabase
    .from("audit_log")
    .select("id, actor_name, action, target_name, details, created_at")
    .order("created_at", { ascending: false })
    .limit(200);

  const rows = (data ?? []) as {
    id: string;
    actor_name: string | null;
    action: string;
    target_name: string | null;
    details: Record<string, unknown> | null;
    created_at: string;
  }[];

  return (
    <>
      <PageHeader title="Auditoria" subtitle="Quem trocou o quê, e quando." />

      {rows.length === 0 ? (
        <EmptyState>Nenhum registro ainda.</EmptyState>
      ) : (
        <div className="space-y-2">
          {rows.map((r) => (
            <Card key={r.id} className="!p-3">
              <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                <span>
                  <strong>{r.actor_name || "Alguém"}</strong> ·{" "}
                  {ACTION_LABEL[r.action] ?? r.action} · <strong>{r.target_name || "—"}</strong>
                </span>
                <span className="text-xs text-[var(--muted)]">{formatDateTime(r.created_at)}</span>
              </div>
              {r.details ? (
                <pre className="mt-1 overflow-x-auto text-xs text-[var(--muted)]">
                  {JSON.stringify(r.details)}
                </pre>
              ) : null}
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
