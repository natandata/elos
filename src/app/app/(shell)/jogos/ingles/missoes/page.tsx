import { requireRole } from "@/lib/auth";
import { BabelTop } from "@/components/english/BabelTop";
import { QuestsView } from "@/components/english/QuestsView";
import { getEnglishState } from "@/lib/english/data.server";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Missões · Babel" };

export default async function MissoesPage() {
  const { profile } = await requireRole("cria", "leader", "admin");
  const state = await getEnglishState(await createClient(), profile.id);
  return (
    <div className="bb-pad">
      <BabelTop state={state} />
      <QuestsView state={state} userId={profile.id} />
    </div>
  );
}
