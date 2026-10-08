import { redirect } from "next/navigation";
import { LiveLobby } from "@/components/games/dress/LiveLobby";
import { requireRole } from "@/lib/auth";
import { gameOpenFor } from "@/lib/games/releaseServer";

export const metadata = { title: "Passarela ao vivo" };

export default async function SalaLobbyPage() {
  const { profile } = await requireRole("cria", "leader", "admin");
  if (!(await gameOpenFor("dress", profile.id))) redirect("/app/jogos/vestir");
  return <LiveLobby />;
}
