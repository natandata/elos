import Link from "next/link";
import { DuelStarter } from "@/components/games/DuelStarter";
import { PageHeader } from "@/components/ui";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

type DuelRow = {
  id: string;
  challenger_id: string;
  opponent_id: string;
  challenger_score: number | null;
  opponent_score: number | null;
  winner_id: string | null;
  status: string;
};

export default async function DueloPage() {
  const { profile } = await requireRole("cria", "leader", "admin");
  const supabase = await createClient();

  const [matesRes, duelsRes] = await Promise.all([
    profile.elo_id
      ? supabase
          .from("profiles")
          .select("id, full_name, avatar_url")
          .eq("elo_id", profile.elo_id)
          .in("role", ["cria", "leader"])
          .neq("id", profile.id)
          .order("full_name")
      : Promise.resolve({ data: [] }),
    supabase
      .from("game_duels")
      .select("id, challenger_id, opponent_id, challenger_score, opponent_score, winner_id, status")
      .gte("created_at", new Date(Date.now() - 7 * 86_400_000).toISOString())
      .order("created_at", { ascending: false })
      .limit(15),
  ]);

  const mates = ((matesRes.data ?? []) as { id: string; full_name: string; avatar_url: string | null }[]).map((m) => ({
    id: m.id,
    name: m.full_name || "Sem nome",
    avatarUrl: m.avatar_url,
  }));
  const nameOf = new Map(mates.map((m) => [m.id, m.name]));
  const duels = (duelsRes.data ?? []) as DuelRow[];

  function describe(d: DuelRow) {
    const iAmChallenger = d.challenger_id === profile.id;
    const otherId = iAmChallenger ? d.opponent_id : d.challenger_id;
    const other = nameOf.get(otherId) ?? "colega";
    const mine = iAmChallenger ? d.challenger_score : d.opponent_score;
    const theirs = iAmChallenger ? d.opponent_score : d.challenger_score;
    if (d.status === "finished") {
      const result = d.winner_id === null ? "🤝 Empate" : d.winner_id === profile.id ? "🏆 Você venceu" : "😅 Você perdeu";
      return { other, label: `${result} · ${mine} x ${theirs}`, cta: "Ver", urgent: false };
    }
    if (mine === null) return { other, label: "⚡ É a sua vez de jogar!", cta: "Jogar", urgent: true };
    return { other, label: "⏳ Esperando o colega jogar", cta: "Ver", urgent: false };
  }

  return (
    <>
      <PageHeader
        title="⚔️ Duelo 1x1"
        subtitle="Mesmas 5 perguntas pra vocês dois, cada um joga quando puder. Vencedor +2 XP, empate +1 pra cada (no máximo 2 XP de duelo por dia)."
      />

      {duels.length > 0 ? (
        <section className="mb-6">
          <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-[var(--muted)]">Seus duelos</h2>
          <div className="space-y-2">
            {duels.map((d) => {
              const info = describe(d);
              return (
                <Link
                  key={d.id}
                  href={`/app/jogos/duelo/${d.id}`}
                  className={`card flex items-center justify-between gap-3 p-4 ${info.urgent ? "border-2 border-rose-400" : ""}`}
                >
                  <div className="min-w-0">
                    <p className="truncate text-base font-black">vs {info.other}</p>
                    <p className="text-sm font-semibold text-[var(--muted)]">{info.label}</p>
                  </div>
                  <span className="shrink-0 text-sm font-black text-[var(--accent-strong)]">{info.cta} →</span>
                </Link>
              );
            })}
          </div>
        </section>
      ) : null}

      <section>
        <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-[var(--muted)]">Desafiar alguém do seu Elo</h2>
        <DuelStarter mates={mates} />
      </section>
    </>
  );
}
