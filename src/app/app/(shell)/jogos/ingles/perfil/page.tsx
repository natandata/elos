import { requireRole } from "@/lib/auth";
import { BabelTop } from "@/components/english/BabelTop";
import { ProfileView } from "@/components/english/ProfileView";
import { getEnglishState } from "@/lib/english/data.server";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Perfil · Babel" };

export default async function PerfilPage() {
  const { profile } = await requireRole("cria", "leader", "admin");
  const state = await getEnglishState(await createClient(), profile.id);
  return (
    <div className="bb-pad">
      <BabelTop state={state} />
      <ProfileView state={state} name={profile.full_name ?? "Você"} />
    </div>
  );
}
