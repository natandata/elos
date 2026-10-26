import { requireRole } from "@/lib/auth";
import { BabelTop } from "@/components/english/BabelTop";
import { ShopView } from "@/components/english/ShopView";
import { getEnglishState } from "@/lib/english/data.server";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Loja · Babel" };

export default async function LojaPage() {
  const { profile } = await requireRole("cria", "leader", "admin");
  const state = await getEnglishState(await createClient(), profile.id);
  return (
    <div className="bb-pad">
      <BabelTop state={state} />
      <ShopView state={state} />
    </div>
  );
}
