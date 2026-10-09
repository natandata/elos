import { redirect } from "next/navigation";
import { LandscapeShell } from "@/components/games/dress/LandscapeShell";
import { MadureiraClient } from "@/components/games/dress/MadureiraClient";
import { requireRole } from "@/lib/auth";
import { gameOpenFor } from "@/lib/games/releaseServer";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Madureira Shopping" };

export default async function ShoppingPage() {
  const { profile } = await requireRole("cria", "leader", "admin");
  // Em construção: quem não é admin (nem tem acesso antecipado) volta para o Vista o Herói como se o shopping não existisse.
  if (!(await gameOpenFor("dress", profile.id)) || !(await gameOpenFor("madureira", profile.id))) redirect("/app/jogos/vestir");
  const supabase = await createClient();
  const [stats, inv] = await Promise.all([
    supabase.from("dress_stats").select("tickets").eq("user_id", profile.id).maybeSingle<{ tickets: number }>(),
    supabase.from("dress_inventory").select("family").eq("user_id", profile.id),
  ]);
  return (
    <LandscapeShell>
      <MadureiraClient meId={profile.id} meName={profile.full_name?.trim() || "Jogadora"} tickets={stats.data?.tickets ?? 0} owned={((inv.data ?? []) as { family: string }[]).map((r) => r.family)} />
    </LandscapeShell>
  );
}
