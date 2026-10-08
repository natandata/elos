import { redirect } from "next/navigation";
import { QdClient } from "@/components/quemdesenha/QdClient";
import { requireRole } from "@/lib/auth";
import { gameOpenFor } from "@/lib/games/releaseServer";
import { EMPTY_STATS, type QdStats } from "@/lib/quemdesenha/rules";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Quem Desenha?" };

export default async function QuemDesenhaPage() {
  const { profile } = await requireRole("cria", "leader", "admin");
  // Em construção: quem não é admin (nem tem acesso antecipado) volta para a Sala de Jogos como se o jogo não existisse.
  if (!(await gameOpenFor("quemdesenha", profile.id))) redirect("/app/jogos");
  const supabase = await createClient();
  const { data } = await supabase.from("qd_stats").select("stars, matches, wins, drawings, guesses, win_streak, best_streak").eq("user_id", profile.id).maybeSingle<QdStats>();
  return (
    <div className="mx-auto max-w-xl">
      <QdClient me={{ id: profile.id, name: profile.full_name?.split(" ")[0] || "Jogador" }} initial={data ?? EMPTY_STATS} />
    </div>
  );
}
