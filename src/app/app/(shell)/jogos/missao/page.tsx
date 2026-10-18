import { redirect } from "next/navigation";
import { MissaoClient } from "@/components/missao/MissaoClient";
import { requireRole } from "@/lib/auth";
import { gameOpenFor } from "@/lib/games/releaseServer";

export const metadata = { title: "Missão Madureira" };

export default async function MissaoPage() {
  const { profile } = await requireRole("cria", "leader", "admin");
  // Em construção: quem não é admin (nem tem acesso antecipado) volta para a Sala de Jogos como se o jogo não existisse.
  if (!(await gameOpenFor("missao", profile.id))) redirect("/app/jogos");
  return <MissaoClient name={profile.full_name?.split(" ")[0] || "Você"} />;
}
