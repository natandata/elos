import { Card, EmptyState, PageHeader } from "@/components/ui";
import { requireProfile } from "@/lib/auth";
import { markAllRead } from "@/lib/actions/notifications";
import { createClient } from "@/lib/supabase/server";
import { formatDateTime } from "@/lib/types";

export default async function NotificacoesPage() {
  await requireProfile();
  const supabase = await createClient();

  const { data } = await supabase
    .from("notifications")
    .select("id, title, body, read, created_at")
    .order("created_at", { ascending: false })
    .limit(50);

  const items = (data ?? []) as {
    id: string;
    title: string;
    body: string | null;
    read: boolean;
    created_at: string;
  }[];

  const unread = items.filter((i) => !i.read).length;

  return (
    <>
      <PageHeader
        title="Notificações"
        subtitle={unread > 0 ? `${unread} não lida(s).` : "Tudo em dia."}
        action={
          unread > 0 ? (
            <form action={markAllRead}>
              <button className="btn btn-ghost !py-2 !text-sm">Marcar todas como lidas</button>
            </form>
          ) : null
        }
      />

      {items.length === 0 ? (
        <EmptyState>Nenhuma notificação por enquanto.</EmptyState>
      ) : (
        <div className="space-y-2">
          {items.map((n) => (
            <Card key={n.id} className={n.read ? "opacity-60" : ""}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-semibold">{n.title}</p>
                  {n.body ? <p className="text-sm text-[var(--muted)]">{n.body}</p> : null}
                </div>
                {!n.read ? (
                  <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-[var(--accent)]" />
                ) : null}
              </div>
              <p className="mt-2 text-xs text-[var(--muted)]">{formatDateTime(n.created_at)}</p>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
