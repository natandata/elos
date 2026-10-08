import { redirect } from "next/navigation";
import { Camarim } from "@/components/games/dress/Camarim";
import { requireRole } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { todayBR } from "@/lib/games/engine";
import { gameOpenFor } from "@/lib/games/releaseServer";
import { camarimMsLeft } from "@/lib/games/dress/clock";
import { runwayTheme } from "@/lib/games/dress/runway";

const HUB = "/app/jogos/vestir";

export default async function CamarimPage() {
  const { profile } = await requireRole("cria", "leader", "admin");
  if (!(await gameOpenFor("dress", profile.id))) redirect(HUB);
  const admin = createAdminClient();
  if (!admin) redirect(HUB);

  const date = todayBR();
  const [mine, cam] = await Promise.all([
    admin.from("dress_runway_looks").select("id").eq("user_id", profile.id).eq("theme_date", date).maybeSingle(),
    admin.from("dress_camarim").select("started_at").eq("user_id", profile.id).eq("play_date", date).maybeSingle<{ started_at: string }>(),
  ]);
  if (mine.data) redirect(`${HUB}/passarela`);
  if (!cam.data) redirect(HUB);
  const msLeft = camarimMsLeft(cam.data.started_at);
  if (msLeft === null) redirect(HUB);

  const theme = runwayTheme(date);
  return <Camarim theme={theme} mode="daily" msLeft={msLeft} draftKey={`vh:draft:${date}`} exitHref={HUB} />;
}
