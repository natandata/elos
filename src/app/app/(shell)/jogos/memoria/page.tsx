import Link from "next/link";
import { MemoryChallenge } from "@/components/games/MemoryChallenge";
import { MemorySolo } from "@/components/games/MemorySolo";
import { requireRole } from "@/lib/auth";
import { SOLO_SIZES, fmtMs } from "@/lib/games/memory";
import { createClient } from "@/lib/supabase/server";

type Row = {
  id: string;
  challenger_id: string;
  opponent_id: string;
  pairs: number;
  status: string;
  c_ms: number | null;
  o_ms: number | null;
  winner_id: string | null;
  created_at: string;
};

const nowMs = () => Date.now();

export default async function MemoriaPage() {
  const { profile } = await requireRole("cria", "leader", "admin");
  const supabase = await createClient();

  const [matesRes, duelsRes] = await Promise.all([
    profile.elo_id
      ? supabase.from("profiles").select("id, full_name, avatar_url").eq("elo_id", profile.elo_id).in("role", ["cria", "leader"]).neq("id", profile.id).order("full_name")
      : Promise.resolve({ data: [] }),
    supabase
      .from("memory_duels")
      .select("id, challenger_id, opponent_id, pairs, status, c_ms, o_ms, winner_id, created_at")
      .gte("created_at", new Date(nowMs() - 7 * 86_400_000).toISOString())
      .order("created_at", { ascending: false })
      .limit(15),
  ]);

  const mates = ((matesRes.data ?? []) as { id: string; full_name: string; avatar_url: string | null }[]).map((m) => ({ id: m.id, name: m.full_name || "Sem nome", avatarUrl: m.avatar_url }));
  const nameOf = new Map(mates.map((m) => [m.id, m.name]));
  const duels = (duelsRes.data ?? []) as Row[];
  const expired = (d: Row) => d.status === "open" && nowMs() - new Date(d.created_at).getTime() > 24 * 3_600_000;

  function describe(d: Row) {
    const mine = d.challenger_id === profile.id;
    const other = `${nameOf.get(mine ? d.opponent_id : d.challenger_id) ?? "colega"} · ${SOLO_SIZES.find((s) => s.pairs === d.pairs)?.label ?? `${d.pairs} pares`}`;
    const myMs = mine ? d.c_ms : d.o_ms;
    const theirMs = mine ? d.o_ms : d.c_ms;
    if (d.status === "finished") {
      const r = d.winner_id === null ? "🤝 Empate" : d.winner_id === profile.id ? "🏆 Você venceu" : "😅 Você perdeu";
      return { other, label: `${r} · ${fmtMs(myMs ?? 0)} x ${fmtMs(theirMs ?? 0)}`, cta: "Ver", urgent: false };
    }
    if (expired(d)) return { other, label: "⌛ Expirou", cta: "Ver", urgent: false };
    if (myMs === null) return { other, label: "⚡ É a sua vez de jogar!", cta: "Jogar", urgent: true };
    return { other, label: "⏳ Esperando o colega jogar", cta: "Ver", urgent: false };
  }

  return (
    <>
      <div className="relative mb-5 overflow-hidden rounded-2xl border-[3px] border-amber-400 shadow-lg">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/memoria/capa.webp" alt="Memória dos Heróis: o jogo de memória da Arena" className="block aspect-[4/3] w-full object-cover" draggable={false} />
      </div>
      <p className="mb-5 text-center text-sm text-[var(--muted)]">Ache os pares com as cartas da Arena. Treine sozinho ou desafie um colega: vence quem terminar primeiro.</p>

      <section className="mb-6">
        <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-[var(--muted)]">Treino</h2>
        <MemorySolo />
        <p className="mt-2 text-xs text-[var(--muted)]">O treino não dá XP. O duelo (você escolhe o nível) vale até +2 XP por dia (junto com o Duelo 1x1).</p>
      </section>

      {duels.length > 0 ? (
        <section className="mb-6">
          <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-[var(--muted)]">Seus desafios</h2>
          <ul className="space-y-2">
            {duels.map((d) => {
              const x = describe(d);
              return (
                <li key={d.id} className="card flex items-center gap-3 p-3">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-black">{x.other}</span>
                    <span className={`block text-xs font-bold ${x.urgent ? "text-rose-600" : "text-[var(--muted)]"}`}>{x.label}</span>
                  </span>
                  <Link href={`/app/jogos/memoria/${d.id}`} className={`btn !px-4 !py-2 !text-sm ${x.urgent ? "btn-primary" : "btn-ghost"}`}>
                    {x.cta}
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      <section>
        <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-[var(--muted)]">Desafiar um colega do Elo</h2>
        <MemoryChallenge mates={mates} />
      </section>
    </>
  );
}
