import { redirect } from "next/navigation";
import { LiveRoom } from "@/components/games/dress/LiveRoom";
import { requireRole } from "@/lib/auth";
import { cleanCode } from "@/lib/games/dress/live";
import { gameOpenFor } from "@/lib/games/releaseServer";

export const metadata = { title: "Sala ao vivo" };

export default async function SalaPage({ params, searchParams }: { params: Promise<{ code: string }>; searchParams: Promise<{ assistir?: string }> }) {
  const { profile } = await requireRole("cria", "leader", "admin");
  if (!(await gameOpenFor("dress", profile.id))) redirect("/app/jogos/vestir");
  const code = cleanCode((await params).code);
  if (code.length !== 4) redirect("/app/jogos/vestir/sala");
  const watch = (await searchParams).assistir === "1";
  return <LiveRoom code={code} meId={profile.id} watch={watch} />;
}
