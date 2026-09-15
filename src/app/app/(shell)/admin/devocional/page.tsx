import { Card, Chip, EmptyState, PageHeader } from "@/components/ui";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import {
  formatDateTime,
  relativeDay,
  type DevotionalEntry,
  type DevotionalFavorite,
  type PrayerRequest,
} from "@/lib/types";

type UserRow = {
  id: string;
  full_name: string;
  role: "cria" | "leader";
  devotional_streak: number;
  devotional_streak_date: string | null;
  elos: { name: string } | null;
};

export default async function AdminDevocionalPage() {
  await requireRole("admin");
  const supabase = await createClient();

  // Só cria/líder têm "Meu Devocional" no menu — admin e responsável não
  // produzem esse conteúdo.
  const [usersRes, entriesRes, prayersRes, favoritesRes] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, full_name, role, devotional_streak, devotional_streak_date, elos:elo_id(name)")
      .in("role", ["cria", "leader"])
      .order("full_name"),
    supabase
      .from("devotional_entries")
      .select("*")
      .order("entry_date", { ascending: false })
      .limit(1000),
    supabase
      .from("prayer_requests")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(1000),
    supabase
      .from("devotional_favorites")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(1000),
  ]);

  const users = (usersRes.data ?? []) as unknown as UserRow[];
  const entries = (entriesRes.data ?? []) as DevotionalEntry[];
  const prayers = (prayersRes.data ?? []) as PrayerRequest[];
  const favorites = (favoritesRes.data ?? []) as DevotionalFavorite[];

  const entriesByUser = new Map<string, DevotionalEntry[]>();
  entries.forEach((e) => {
    if (!entriesByUser.has(e.user_id)) entriesByUser.set(e.user_id, []);
    entriesByUser.get(e.user_id)!.push(e);
  });
  const prayersByUser = new Map<string, PrayerRequest[]>();
  prayers.forEach((p) => {
    if (!prayersByUser.has(p.user_id)) prayersByUser.set(p.user_id, []);
    prayersByUser.get(p.user_id)!.push(p);
  });
  const favoritesByUser = new Map<string, DevotionalFavorite[]>();
  favorites.forEach((f) => {
    if (!favoritesByUser.has(f.user_id)) favoritesByUser.set(f.user_id, []);
    favoritesByUser.get(f.user_id)!.push(f);
  });

  const lastActivity = (userId: string): string | null => {
    const dates = [
      entriesByUser.get(userId)?.[0]?.updated_at,
      prayersByUser.get(userId)?.[0]?.created_at,
      favoritesByUser.get(userId)?.[0]?.created_at,
    ].filter(Boolean) as string[];
    if (!dates.length) return null;
    return dates.sort((a, b) => (a > b ? -1 : 1))[0];
  };

  // Quem tem qualquer atividade primeiro, mais recente primeiro; sem
  // nenhuma atividade, no fim, por nome.
  const sorted = [...users].sort((a, b) => {
    const la = lastActivity(a.id);
    const lb = lastActivity(b.id);
    if (la && lb) return la > lb ? -1 : 1;
    if (la) return -1;
    if (lb) return 1;
    return a.full_name.localeCompare(b.full_name);
  });

  const totalEntries = entries.length;
  const totalPrayers = prayers.length;
  const totalFavorites = favorites.length;
  const activeUsers = users.filter((u) => lastActivity(u.id)).length;

  return (
    <>
      <PageHeader
        title="Devocional"
        subtitle="Acompanhamento do uso do Meu Devocional — diário, orações e versículos de cada pessoa."
      />

      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card className="text-center">
          <p className="text-2xl font-bold tabular-nums">{activeUsers}</p>
          <p className="text-xs text-[var(--muted)]">de {users.length} já usaram</p>
        </Card>
        <Card className="text-center">
          <p className="text-2xl font-bold tabular-nums">{totalEntries}</p>
          <p className="text-xs text-[var(--muted)]">anotações no diário</p>
        </Card>
        <Card className="text-center">
          <p className="text-2xl font-bold tabular-nums">{totalPrayers}</p>
          <p className="text-xs text-[var(--muted)]">pedidos de oração</p>
        </Card>
        <Card className="text-center">
          <p className="text-2xl font-bold tabular-nums">{totalFavorites}</p>
          <p className="text-xs text-[var(--muted)]">versículos favoritados</p>
        </Card>
      </div>

      {sorted.length === 0 ? (
        <EmptyState>Nenhum cria ou líder cadastrado ainda.</EmptyState>
      ) : (
        <div className="space-y-3">
          {sorted.map((u) => {
            const userEntries = entriesByUser.get(u.id) ?? [];
            const userPrayers = prayersByUser.get(u.id) ?? [];
            const userFavorites = favoritesByUser.get(u.id) ?? [];
            const last = lastActivity(u.id);
            const total = userEntries.length + userPrayers.length + userFavorites.length;

            return (
              <Card key={u.id}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-bold">{u.full_name || "Sem nome"}</p>
                    <p className="text-xs text-[var(--muted)]">
                      {u.elos?.name ?? "Sem Elo"} ·{" "}
                      {last ? `Última atividade ${relativeDay(last).toLowerCase()}` : "Nunca usou"}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {u.devotional_streak > 0 ? (
                      <Chip className="border-amber-200 bg-amber-100 text-amber-800">
                        🔥 {u.devotional_streak} {u.devotional_streak === 1 ? "dia" : "dias"}
                      </Chip>
                    ) : null}
                    <Chip className="border-[var(--line)] text-[var(--muted)]">
                      {userEntries.length} anotações
                    </Chip>
                    <Chip className="border-[var(--line)] text-[var(--muted)]">
                      {userPrayers.length} orações
                    </Chip>
                    <Chip className="border-[var(--line)] text-[var(--muted)]">
                      {userFavorites.length} favoritos
                    </Chip>
                  </div>
                </div>

                {total > 0 ? (
                  <details className="mt-3">
                    <summary className="cursor-pointer text-xs font-semibold text-[var(--muted)]">
                      Ver tudo que {u.full_name.split(" ")[0] || "a pessoa"} registrou
                    </summary>

                    <div className="mt-3 space-y-4 border-t border-[var(--line)] pt-3">
                      {userEntries.length > 0 ? (
                        <div>
                          <p className="label mb-2">📖 Diário</p>
                          <ul className="space-y-2">
                            {userEntries.map((e) => (
                              <li
                                key={e.id}
                                className="rounded-xl border border-[var(--line)] bg-[var(--bg)] p-3"
                              >
                                <p className="text-xs font-semibold text-[var(--muted)]">
                                  {new Date(`${e.entry_date}T00:00:00`).toLocaleDateString("pt-BR")}
                                </p>
                                <p className="mt-1 whitespace-pre-wrap text-sm">{e.content}</p>
                              </li>
                            ))}
                          </ul>
                        </div>
                      ) : null}

                      {userPrayers.length > 0 ? (
                        <div>
                          <p className="label mb-2">🙏 Pedidos de oração</p>
                          <ul className="space-y-2">
                            {userPrayers.map((p) => (
                              <li
                                key={p.id}
                                className="rounded-xl border border-[var(--line)] bg-[var(--bg)] p-3"
                              >
                                <div className="flex flex-wrap items-center gap-2">
                                  <p className="text-sm font-medium">{p.title}</p>
                                  {p.is_answered ? (
                                    <Chip className="border-emerald-200 bg-emerald-100 text-emerald-800">
                                      Respondido
                                    </Chip>
                                  ) : null}
                                  {p.scope === "elo" ? (
                                    <Chip className="border-[var(--line)] text-[var(--muted)]">
                                      Compartilhado com o Elo
                                    </Chip>
                                  ) : null}
                                </div>
                                <p className="mt-1 text-xs text-[var(--muted)]">
                                  {formatDateTime(p.created_at)}
                                </p>
                              </li>
                            ))}
                          </ul>
                        </div>
                      ) : null}

                      {userFavorites.length > 0 ? (
                        <div>
                          <p className="label mb-2">⭐ Versículos favoritos</p>
                          <ul className="space-y-2">
                            {userFavorites.map((f) => (
                              <li
                                key={f.id}
                                className="rounded-xl border border-[var(--line)] bg-[var(--bg)] p-3"
                              >
                                <p className="text-xs font-semibold text-[var(--muted)]">{f.reference}</p>
                                <p className="mt-1 text-sm italic">"{f.verse_text}"</p>
                              </li>
                            ))}
                          </ul>
                        </div>
                      ) : null}
                    </div>
                  </details>
                ) : null}
              </Card>
            );
          })}
        </div>
      )}
    </>
  );
}
