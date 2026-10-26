import { redirect } from "next/navigation";
import { Nunito } from "next/font/google";
import { requireRole } from "@/lib/auth";
import { guardGame } from "@/lib/games/guard";
import { gameOpenFor } from "@/lib/games/releaseServer";

const nunito = Nunito({ subsets: ["latin"], weight: ["600", "700", "800", "900"], variable: "--font-nunito", display: "swap" });

export default async function Layout({ children }: { children: React.ReactNode }) {
  await guardGame("english");
  const { profile } = await requireRole("cria", "leader", "admin");
  // Em construção: quem não é admin (nem tem acesso antecipado) volta para a Sala de Jogos como se o jogo não existisse.
  if (!(await gameOpenFor("english", profile.id))) redirect("/app/jogos");
  // Tela cheia (cobre o menu do ELOS), com visual e fonte próprios do Babel.
  return (
    <div className={`bb-root ${nunito.variable}`}>
      <div className="bb-wrap">{children}</div>
    </div>
  );
}
