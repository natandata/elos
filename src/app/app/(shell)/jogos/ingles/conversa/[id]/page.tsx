import { notFound, redirect } from "next/navigation";
import { RoleplayPlayer } from "@/components/english/RoleplayPlayer";
import { requireRole } from "@/lib/auth";
import { ROLEPLAY_BY_ID } from "@/lib/english/content";
import { getEnglishState } from "@/lib/english/data.server";
import { roleplayUnlocked } from "@/lib/english/progress";
import { createClient } from "@/lib/supabase/server";

const HOME = "/app/jogos/ingles";

export default async function ConversaPage({ params }: { params: Promise<{ id: string }> }) {
  const { profile } = await requireRole("cria", "leader", "admin");
  const { id } = await params;
  const rp = ROLEPLAY_BY_ID[id];
  if (!rp) notFound();
  const state = await getEnglishState(await createClient(), profile.id);
  if (!roleplayUnlocked(rp.unit, new Set(state.done.keys()), state.startUnit)) redirect(HOME);
  return <RoleplayPlayer rp={rp} backHref={HOME} />;
}
