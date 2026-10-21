import { TribosApp } from "@/components/tribos/TribosApp";
import { requireRole } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { loadState } from "@/lib/tribos/server";

export const metadata = { title: "Clash of Tribos" };

export default async function TribosPage() {
  const { profile } = await requireRole("cria", "leader", "admin");
  const admin = createAdminClient();
  const state = admin ? await loadState(admin, profile.id) : null;
  return <TribosApp initial={state} unavailable={!admin} />;
}
