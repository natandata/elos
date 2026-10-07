import { ArenaCampaign } from "@/components/arena/ArenaCampaign";
import { PageHeader } from "@/components/ui";
import { requireRole } from "@/lib/auth";
import { campaignState } from "@/lib/arena/campaignServer";
import { createAdminClient } from "@/lib/supabase/admin";

export const metadata = { title: "Campanha · Arena dos Heróis" };

export default async function CampanhaPage() {
  const { profile } = await requireRole("cria", "leader", "admin");
  const admin = createAdminClient();
  const st = admin ? await campaignState(admin, profile.id) : { open: false, admin: profile.role === "admin", cleared: [] as number[], tiers: [0, 0, 0, 0, 0, 0, 0, 0] };
  return (
    <>
      <PageHeader title="🛡️ Campanha" subtitle="8 arenas, 8 personagens, uma só vitória por vez." />
      <ArenaCampaign open={st.open} admin={st.admin} cleared={st.cleared} tiers={st.tiers} />
    </>
  );
}
