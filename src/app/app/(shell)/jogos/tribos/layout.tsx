import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { guardGame } from "@/lib/games/guard";
import { gameOpenFor } from "@/lib/games/releaseServer";

export default async function Layout({ children }: { children: React.ReactNode }) {
  await guardGame("tribos");
  const { profile } = await requireRole("cria", "leader", "admin");
  // Em construção: quem não é admin (nem tem acesso antecipado) volta para a Sala de Jogos como se o jogo não existisse.
  if (!(await gameOpenFor("tribos", profile.id))) redirect("/app/jogos");
  return children;
}
