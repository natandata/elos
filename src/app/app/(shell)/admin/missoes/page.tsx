import { MissionsWorkspace } from "@/components/missions/MissionsWorkspace";
import { requireRole } from "@/lib/auth";

export default async function AdminMissoesPage() {
  const { profile } = await requireRole("admin");
  return <MissionsWorkspace profile={profile} />;
}
