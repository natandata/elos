import { redirect } from "next/navigation";
import { TriboClient } from "@/components/ultimatribo/TriboClient";
import { requireRole } from "@/lib/auth";
import { gameOpenFor } from "@/lib/games/releaseServer";
import { createClient } from "@/lib/supabase/server";
import { EMPTY_STATS, type TriboStats } from "@/lib/ultimatribo/progress";

export const metadata = { title: "A Última Tribo" };

export default async function UltimaTriboPage() {
  const { profile } = await requireRole("cria", "leader", "admin");
  // Em construção: quem não é admin (nem tem acesso antecipado) volta para a Sala de Jogos como se o jogo não existisse.
  if (!(await gameOpenFor("ultimatribo", profile.id))) redirect("/app/jogos");
  const supabase = await createClient();
  const { data } = await supabase.from("tribo_stats").select("xp, matches, wins, kills, best_place, lore").eq("user_id", profile.id).maybeSingle<TriboStats>();
  return <TriboClient name={profile.full_name?.split(" ")[0] || "Você"} initial={data ?? EMPTY_STATS} />;
}
