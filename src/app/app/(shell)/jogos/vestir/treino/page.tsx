import { redirect } from "next/navigation";
import { Camarim } from "@/components/games/dress/Camarim";
import { requireRole } from "@/lib/auth";
import { todayBR } from "@/lib/games/engine";
import { gameOpenFor } from "@/lib/games/releaseServer";
import { practiceTheme } from "@/lib/games/dress/engine";

export default async function TreinoPage({ searchParams }: { searchParams: Promise<{ n?: string }> }) {
  const { profile } = await requireRole("cria", "leader", "admin");
  if (!(await gameOpenFor("dress", profile.id))) redirect("/app/jogos/vestir");
  const { n: raw } = await searchParams;
  const n = Math.max(1, Math.min(99, Math.floor(Number(raw)) || 1));
  const theme = practiceTheme(todayBR(), n);
  return <Camarim key={n} theme={theme} mode="practice" practiceN={n} draftKey={`vh:draft:p${n}`} exitHref="/app/jogos/vestir" />;
}
