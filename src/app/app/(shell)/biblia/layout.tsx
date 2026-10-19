import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { BIBLE_GATE_SECONDS, bibleGateFor } from "@/lib/games/bibleGate";
import { ReadingTimer } from "@/components/bible/ReadingTimer";

// Para o cria, a Bíblia mostra o timer dos 5 minutos que liberam a Sala de Jogos do dia.
export default async function BibliaLayout({ children }: { children: React.ReactNode }) {
  const { profile, viewingAs } = await requireProfile();
  if (profile.role !== "cria" || viewingAs) return <>{children}</>;
  const gate = await bibleGateFor(await createClient(), profile);
  return (
    <>
      <ReadingTimer initialSeconds={gate.locked ? gate.seconds : BIBLE_GATE_SECONDS} required={BIBLE_GATE_SECONDS} />
      {children}
    </>
  );
}
