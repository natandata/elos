import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { BabelTop } from "@/components/english/BabelTop";
import { LeaderCall } from "@/components/english/LeaderCall";
import { IcoBack } from "@/components/english/icons";
import { LESSON_ORDER } from "@/lib/english/content";
import { getEnglishState } from "@/lib/english/data.server";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Conversa com o líder · Babel" };

export default async function LiderPage() {
  const { profile } = await requireRole("cria", "leader", "admin");
  const state = await getEnglishState(await createClient(), profile.id);
  const unlocked = LESSON_ORDER.every((id) => state.done.has(id));
  return (
    <div className="bb-pad">
      <BabelTop state={state} />
      <Link href="/app/jogos/ingles" className="mt-4 inline-flex items-center gap-1 text-sm font-extrabold text-[var(--bb-mute)]">
        <IcoBack className="h-4 w-4" /> Trilha
      </Link>
      <h1 className="mt-2 text-2xl font-extrabold">Conversa com o líder</h1>
      <LeaderCall unlocked={unlocked} call={state.leaderCall} />
    </div>
  );
}
