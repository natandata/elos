import Link from "next/link";
import { redirect } from "next/navigation";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Avatar } from "@/components/Avatar";
import { ChevronLeftIcon } from "@/components/feed/icons";
import { relativeTimeShort } from "@/lib/relativeTime";

type Row = {
  thread_id: string;
  a_id: string;
  a_name: string;
  a_avatar: string | null;
  b_id: string;
  b_name: string;
  b_avatar: string | null;
  last_body: string;
  last_at: string;
};

/** Liderança/admin: todas as conversas do Elogram (só leitura, com opção de apagar mensagem imprópria). */
export default async function AllConversationsPage() {
  const { profile } = await requireProfile();
  if (profile.role !== "leader" && profile.role !== "admin") redirect("/app/elogram/mensagens");

  const supabase = await createClient();
  const { data } = await supabase.rpc("dm_list_all", { p_limit: 150 });
  const rows = (data ?? []) as Row[];

  return (
    <div>
      <header className="flex items-center gap-2 px-3 pb-1 pt-3">
        <Link href="/app/elogram/mensagens" aria-label="Voltar" className="-ml-1 rounded-lg p-1 text-[var(--muted)]">
          <ChevronLeftIcon />
        </Link>
        <h1 className="text-xl font-bold">Todas as conversas</h1>
      </header>
      <p className="px-4 pb-3 text-xs text-[var(--muted)]">
        A liderança vê as conversas do Elogram para cuidar de quem está lá. Use com respeito.
      </p>

      {rows.length === 0 ? (
        <p className="px-6 py-14 text-center text-sm text-[var(--muted)]">Ainda não há conversas.</p>
      ) : (
        <ul>
          {rows.map((r) => (
            <li key={r.thread_id}>
              <Link href={`/app/elogram/mensagens/${r.thread_id}`} className="flex items-center gap-3.5 px-3 py-2.5">
                <span className="relative h-[58px] w-[58px] shrink-0">
                  <span className="absolute left-0 top-0 rounded-full ring-2 ring-[var(--bg)]">
                    <Avatar url={r.a_avatar} name={r.a_name} size={38} />
                  </span>
                  <span className="absolute bottom-0 right-0 rounded-full ring-2 ring-[var(--bg)]">
                    <Avatar url={r.b_avatar} name={r.b_name} size={38} />
                  </span>
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[16px] font-semibold">
                    {r.a_name} ↔ {r.b_name}
                  </p>
                  <p className="truncate text-[15px] text-[var(--muted)]">
                    {r.last_body} · <span suppressHydrationWarning>{relativeTimeShort(r.last_at)}</span>
                  </p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
