import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { BIBLE_GATE_SECONDS, readingToday } from "@/lib/games/bibleGate";
import { ReadingTimer } from "@/components/bible/ReadingTimer";

// Cria e líder veem o timer dos 5 minutos de leitura do dia (+1 XP; para o cria, também libera a Sala de Jogos).
export default async function BibliaLayout({ children }: { children: React.ReactNode }) {
  const { profile, viewingAs } = await requireProfile();
  if ((profile.role !== "cria" && profile.role !== "leader") || viewingAs) return <>{children}</>;
  const today = await readingToday(await createClient(), profile.id);
  return (
    <>
      <ReadingTimer initialSeconds={today.done ? BIBLE_GATE_SECONDS : today.seconds} required={BIBLE_GATE_SECONDS} role={profile.role} />
      {children}
    </>
  );
}
