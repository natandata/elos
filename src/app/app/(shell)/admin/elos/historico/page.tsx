import { EloHistory } from "@/components/elos/EloHistory";
import { requireRole } from "@/lib/auth";

export default async function AdminEloHistoricoPage({ searchParams }: { searchParams: Promise<{ elo?: string; periodo?: string }> }) {
  const { profile } = await requireRole("admin");
  const sp = await searchParams;
  return <EloHistory profile={profile} basePath="/app/admin/elos/historico" eloParam={sp.elo} periodParam={sp.periodo} />;
}
