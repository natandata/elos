import { Avatar } from "@/components/Avatar";
import { createClient } from "@/lib/supabase/server";

/** Card da tela inicial: quem faz aniversário hoje (um ou mais). */
export async function BirthdayCard({ meId }: { meId: string }) {
  const supabase = await createClient();
  const { data } = await supabase.rpc("birthdays_today");
  const list = (data ?? []) as { id: string; full_name: string; avatar_url: string | null }[];
  if (list.length === 0) return null;
  const mine = list.some((p) => p.id === meId);
  const first = list.map((p) => p.full_name.split(" ")[0]);
  const names = first.length > 1 ? `${first.slice(0, -1).join(", ")} e ${first[first.length - 1]}` : first[0];
  return (
    <section className="card mb-4 overflow-hidden border-2 border-amber-300 bg-gradient-to-br from-amber-50 to-pink-50 p-4 text-center dark:from-amber-950/30 dark:to-pink-950/30" aria-label="Aniversário de hoje">
      <p className="text-4xl" aria-hidden>
        🎉🎂🎈
      </p>
      <h2 className="mt-1 text-lg font-extrabold">{mine ? "Parabéns, hoje é o seu dia!" : list.length === 1 ? "Hoje é aniversário!" : "Hoje tem aniversariantes!"}</h2>
      <ul className="mt-3 flex flex-wrap items-center justify-center gap-3">
        {list.map((p) => (
          <li key={p.id} className="flex items-center gap-2 rounded-full bg-white/80 py-1 pl-1 pr-3 text-sm font-bold shadow-sm dark:bg-white/10">
            <Avatar name={p.full_name} url={p.avatar_url} size={32} />
            {p.full_name}
            {p.id === meId ? " (você)" : ""}
          </li>
        ))}
      </ul>
      <p className="mt-2 text-sm text-[var(--muted)]">Hoje é aniversário de {names}. Deseje um abençoado dia! 🙏</p>
    </section>
  );
}
