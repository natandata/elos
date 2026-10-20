import { requireRole } from "@/lib/auth";
import { EnglishHome } from "@/components/english/EnglishHome";
import { getEnglishState } from "@/lib/english/data.server";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Inglês de CRIA" };

export default async function InglesPage() {
  const { profile } = await requireRole("cria", "leader", "admin");
  const state = await getEnglishState(await createClient(), profile.id);
  return <EnglishHome state={state} />;
}
