import { PageHeader } from "@/components/ui";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { SuggestionBoard } from "@/components/mural/SuggestionBoard";
import type { Suggestion } from "@/lib/types";

export default async function MuralPage() {
  const { profile } = await requireRole("admin", "leader", "cria");
  const supabase = await createClient();

  const [{ data: suggestions }, { data: myHypes }] = await Promise.all([
    supabase.from("v_suggestions").select("*").order("created_at", { ascending: false }),
    supabase.from("suggestion_hypes").select("suggestion_id").eq("user_id", profile.id),
  ]);

  const myHypedIds = new Set(((myHypes ?? []) as { suggestion_id: string }[]).map((h) => h.suggestion_id));

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
        isAdmin={profile.role === "admin"}
      />
    </>
  );
}
