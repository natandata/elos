import { EloHistory } from "@/components/elos/EloHistory";
import { requireRole } from "@/lib/auth";

export default async function LiderHistoricoPage({ searchParams }: { searchParams: Promise<{ periodo?: string }> }) {
  const { profile } = await requireRole("leader");
  const sp = await searchParams;
  return <EloHistory profile={profile} basePath="/app/lider/historico" periodParam={sp.periodo} />;
}
