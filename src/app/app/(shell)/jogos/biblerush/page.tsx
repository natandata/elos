import { redirect } from "next/navigation";
import { BibleRushClient } from "@/components/bible-rush/BibleRushClient";
import { requireRole } from "@/lib/auth";
import { gameOpenFor } from "@/lib/games/releaseServer";

export const metadata = { title: "Bible Rush" };

export default async function BibleRushPage() {
  const { profile } = await requireRole("cria", "leader", "admin");
  // Sem cartão "em breve": quem não pode ver o jogo volta para a Sala de Jogos como se ele não existisse.
  if (!(await gameOpenFor("biblerush", profile.id))) redirect("/app/jogos");
  return <BibleRushClient uid={profile.id} />;
}
