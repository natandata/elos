import { PageHeader } from "@/components/ui";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { SuggestionBoard } from "@/components/mural/SuggestionBoard";
import type { Suggestion } from "@/lib/types";

export default async function MuralPage() {
  const { profile } = await requireRole("admin", "leader", "cria");
  const supabase = await createClient();

  const isAdmin = profile.role === "admin";

  const [{ data: suggestions }, { data: myHypes }, { data: hypesData }] = await Promise.all([
    supabase.from("v_suggestions").select("*").order("created_at", { ascending: false }),
    supabase.from("suggestion_hypes").select("suggestion_id").eq("user_id", profile.id),
    // Só admin precisa de "quem hypou" — os outros só veem a contagem.
    isAdmin
      ? supabase.from("suggestion_hypes").select("suggestion_id, profiles:user_id(full_name)")
      : Promise.resolve({ data: [] }),
  ]);

  const myHypedIds = new Set(((myHypes ?? []) as { suggestion_id: string }[]).map((h) => h.suggestion_id));

  const hypersBySuggestion = new Map<string, string[]>();
  for (const h of (hypesData ?? []) as unknown as {
    suggestion_id: string;
    profiles: { full_name: string } | null;
  }[]) {
    const name = h.profiles?.full_name || "Alguém";
    const list = hypersBySuggestion.get(h.suggestion_id) ?? [];
    list.push(name);
    hypersBySuggestion.set(h.suggestion_id, list);
  }

  return (
    <>
      <PageHeader
        title="Mural de Sugestões"
        subtitle="O que você gostaria de ver ou poder fazer no ELOS? Escreva e hype o que também quiser."
      />
      <SuggestionBoard
        suggestions={(suggestions ?? []) as Suggestion[]}
        myHypedIds={myHypedIds}
        canSubmit={profile.role === "cria"}
        isAdmin={isAdmin}
        hypersBySuggestion={Object.fromEntries(hypersBySuggestion)}
      />
    </>
  );
}
