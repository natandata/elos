import { MissionsWorkspace } from "@/components/missions/MissionsWorkspace";
import { requireRole } from "@/lib/auth";

export default async function LiderMissoesPage() {
  const { profile } = await requireRole("leader");
  return <MissionsWorkspace profile={profile} />;
}
