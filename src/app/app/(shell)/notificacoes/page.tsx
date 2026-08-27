import Link from "next/link";
import { Card, EmptyState, PageHeader } from "@/components/ui";
import { requireProfile } from "@/lib/auth";
import { markAllRead } from "@/lib/actions/notifications";
import { createClient } from "@/lib/supabase/server";
import { formatDateTime } from "@/lib/types";

type Category = "status" | "mission" | "agenda" | "user" | "feed" | "geral";

const FILTERS: { value: string; label: string; categories: Category[] | null }[] = [
  { value: "", label: "Todas", categories: null },
  { value: "status", label: "Apenas Status", categories: ["status"] },
  { value: "mission", label: "Apenas Missões", categories: ["mission"] },
  { value: "agenda", label: "Apenas Agenda", categories: ["agenda"] },
  { value: "feed", label: "Apenas Feed", categories: ["feed"] },
];

const CATEGORY_LABEL: Record<Category, string> = {
  status: "Status",
  mission: "Missões",
  agenda: "Agenda",
  user: "Cadastro",
  feed: "Feed",
  geral: "Geral",
};

const CATEGORY_TONE: Record<Category, string> = {
  status: "border-amber-200 bg-amber-100 text-amber-800",
  mission: "border-violet-200 bg-violet-100 text-violet-800",
  agenda: "border-sky-200 bg-sky-100 text-sky-800",
  user: "border-emerald-200 bg-emerald-100 text-emerald-800",
  feed: "border-pink-200 bg-pink-100 text-pink-800",
  geral: "border-slate-200 bg-slate-100 text-slate-700",
};

export default async function NotificacoesPage({
  searchParams,
}: {
  searchParams: Promise<{ tipo?: string }>;
}) {
  await requireProfile();
  const { tipo } = await searchParams;
  const active = FILTERS.find((f) => f.value === (tipo ?? "")) ?? FILTERS[0];

  const supabase = await createClient();

  let query = supabase
    .from("notifications")
    .select("id, title, body, read, created_at, category")
    .order("created_at", { ascending: false })
    .limit(100);

  if (active.categories) query = query.in("category", active.categories);

  const { data } = await query;

  const items = (data ?? []) as {
    id: string;
    title: string;
    body: string | null;
    read: boolean;
    created_at: string;
    category: Category;
  }[];

  const unread = items.filter((i) => !i.read).length;

  return (
    <>
      <PageHeader
        title="Notificações"
        subtitle={unread > 0 ? `${unread} não lida(s) neste filtro.` : "Tudo em dia."}
        action={
          unread > 0 ? (
            <form action={markAllRead}>
              <button className="btn btn-ghost !py-2 !text-sm">Marcar todas como lidas</button>
            </form>
          ) : null
        }
      />

      <div className="mb-4 flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <Link
            key={f.value || "all"}
            href={f.value ? `/app/notificacoes?tipo=${f.value}` : "/app/notificacoes"}
            className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
              active.value === f.value
                ? "border-[var(--accent)] bg-[var(--accent)] text-[var(--accent-ink)]"
                : "border-[var(--line)] text-[var(--muted)] hover:text-[var(--ink)]"
            }`}
          >
            {f.label}
          </Link>
        ))}
      </div>

      {items.length === 0 ? (
        <EmptyState>
          {active.categories
            ? "Nenhuma notificação desse tipo por enquanto."
            : "Nenhuma notificação por enquanto."}
        </EmptyState>
      ) : (
        <div className="space-y-2">
          {items.map((n) => (
            <Card key={n.id} className={n.read ? "opacity-60" : ""}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold">{n.title}</p>
                    <span className={`chip ${CATEGORY_TONE[n.category] ?? CATEGORY_TONE.geral}`}>
                      {CATEGORY_LABEL[n.category] ?? "Geral"}
                    </span>
                  </div>
                  {n.body ? <p className="mt-1 text-sm text-[var(--muted)]">{n.body}</p> : null}
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
