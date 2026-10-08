import { Avatar } from "@/components/Avatar";
import { EmptyState } from "@/components/ui";
import { daysUntilBirthday, formatBirth, untilLabel } from "@/lib/birthday";
import { createClient } from "@/lib/supabase/server";
import { ROLE_LABEL, type Role } from "@/lib/types";

type Row = { id: string; full_name: string; avatar_url: string | null; role: Role; elo_id: string | null; birth_date: string | null };

/** Aniversários de todos os usuários, do mais próximo ao mais distante, com os dias que faltam. */
export async function AniversariosTab() {
  const supabase = await createClient();
  const [{ data }, { data: elosData }] = await Promise.all([
    supabase.from("profiles").select("id, full_name, avatar_url, role, elo_id, birth_date").eq("is_test_account", false).order("full_name"),
    supabase.from("elos").select("id, name"),
  ]);
  const elo = new Map(((elosData ?? []) as { id: string; name: string }[]).map((e) => [e.id, e.name]));
  const rows = (data ?? []) as Row[];
  const com = rows
    .filter((r) => r.birth_date)
    .map((r) => ({ ...r, dias: daysUntilBirthday(r.birth_date as string) }))
    .sort((a, b) => a.dias - b.dias || a.full_name.localeCompare(b.full_name));
  const sem = rows.filter((r) => !r.birth_date);
  const hoje = com.filter((r) => r.dias === 0);

  return (
    <div className="space-y-4">
      <p className="text-sm text-[var(--muted)]">
        {com.length} com data cadastrada · {sem.length} ainda sem data
        {hoje.length ? ` · 🎉 hoje: ${hoje.map((r) => r.full_name.split(" ")[0]).join(", ")}` : ""}
      </p>
      {com.length === 0 ? (
        <EmptyState>Ninguém informou a data de nascimento ainda.</EmptyState>
      ) : (
        <div className="card divide-y divide-[var(--line)]">
          {com.map((r) => (
            <div key={r.id} className="flex items-center gap-3 px-3 py-2">
              <Avatar name={r.full_name} url={r.avatar_url} size={36} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold">{r.full_name}</p>
                <p className="truncate text-xs text-[var(--muted)]">
                  {ROLE_LABEL[r.role]}
                  {r.elo_id && elo.get(r.elo_id) ? ` · ${elo.get(r.elo_id)}` : ""}
                </p>
              </div>
              <div className="shrink-0 text-right">
                <p className="text-sm font-bold tabular-nums">🎂 {formatBirth(r.birth_date as string)}</p>
                <p className={`text-xs font-bold ${r.dias === 0 ? "text-amber-600" : r.dias <= 7 ? "text-[var(--accent-strong)]" : "text-[var(--muted)]"}`}>{untilLabel(r.dias)}</p>
              </div>
            </div>
          ))}
        </div>
      )}
      {sem.length > 0 ? (
        <section>
          <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-[var(--muted)]">Sem data de nascimento ({sem.length})</h2>
          <div className="card flex flex-wrap gap-2 p-3">
            {sem.map((r) => (
              <span key={r.id} className="rounded-full bg-[var(--bg)] px-3 py-1 text-xs font-semibold">
                {r.full_name}
              </span>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
