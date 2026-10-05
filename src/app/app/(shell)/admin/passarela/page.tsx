import { HideLookButton } from "@/components/games/dress/HideLookButton";
import { PaperDoll } from "@/components/games/dress/PaperDoll";
import { PageHeader } from "@/components/ui";
import { requireRole } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { DRESS_CHARACTER_BY_ID } from "@/lib/games/dress/characters";
import type { Look } from "@/lib/games/dress/items";

type Row = {
  id: string;
  theme_date: string;
  theme_character: string;
  items: Look;
  hidden: boolean;
  place: number | null;
  profiles: { full_name: string } | null;
};

export default async function AdminPassarelaPage() {
  await requireRole("admin");
  const admin = createAdminClient();
  if (!admin) return <p className="card p-4 text-sm font-bold">Falta a chave de serviço do banco no servidor.</p>;

  const { data } = await admin
    .from("dress_runway_looks")
    .select("id, theme_date, theme_character, items, hidden, place, profiles(full_name)")
    .order("theme_date", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(60)
    .returns<Row[]>();
  const rows = data ?? [];
  const votes = new Map<string, number>();
  if (rows.length > 0) {
    const { data: v } = await admin.from("dress_runway_votes").select("look_id").in("look_id", rows.map((r) => r.id));
    for (const x of (v ?? []) as { look_id: string }[]) votes.set(x.look_id, (votes.get(x.look_id) ?? 0) + 1);
  }

  return (
    <>
      <PageHeader title="📸 Passarela" subtitle="Looks publicados no Vista o Herói. Esconda qualquer look que não deva aparecer (ele sai da votação e do prêmio)." />
      {rows.length === 0 ? (
        <p className="card p-4 text-sm text-[var(--muted)]">Nenhum look publicado ainda.</p>
      ) : (
        <ul className="grid grid-cols-2 gap-3">
          {rows.map((r) => {
            const ch = DRESS_CHARACTER_BY_ID.get(r.theme_character);
            return (
              <li key={r.id} className={`card p-2 text-center ${r.hidden ? "opacity-50" : ""}`}>
                {ch ? <PaperDoll base={ch.base} look={r.items} bg={ch.bg} className="mx-auto h-40 w-auto" title="Look" /> : null}
                <p className="mt-1 truncate text-sm font-black">{r.profiles?.full_name}</p>
                <p className="text-[11px] text-[var(--muted)]">
                  {r.theme_date} · {ch?.name} · {votes.get(r.id) ?? 0} voto(s){r.place ? ` · ${r.place}º` : ""}
                </p>
                <div className="mt-1">
                  <HideLookButton id={r.id} hidden={r.hidden} />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
