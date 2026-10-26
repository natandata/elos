import { requireRole } from "@/lib/auth";
import { BabelTop } from "@/components/english/BabelTop";
import { LeagueScreen } from "@/components/english/LeagueScreen";
import { getEnglishState } from "@/lib/english/data.server";
import { loadLeague } from "@/lib/babel/league.server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Ligas · Babel" };

export default async function LigasPage() {
  const { profile } = await requireRole("cria", "leader", "admin");
  const state = await getEnglishState(await createClient(), profile.id);
  const admin = createAdminClient();
  const league = admin ? await loadLeague(admin, profile.id) : null;
  return (
    <div className="bb-pad">
      <BabelTop state={state} />
      {league ? <LeagueScreen league={league} /> : <p className="bb-card mt-6 p-4 text-center text-sm">A liga está indisponível no momento.</p>}
    </div>
  );
}
