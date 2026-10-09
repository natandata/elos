import { redirect } from "next/navigation";
import { TutorialGame } from "@/components/games/dress/TutorialGame";
import { requireRole } from "@/lib/auth";
import { gameOpenFor } from "@/lib/games/releaseServer";

export const metadata = { title: "Tutorial · Vista o Herói" };

export default async function TutorialPage() {
  const { profile } = await requireRole("cria", "leader", "admin");
  if (!(await gameOpenFor("dress", profile.id))) redirect("/app/jogos/vestir");
  return <TutorialGame />;
}
