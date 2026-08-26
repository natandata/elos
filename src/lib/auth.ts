import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Profile, Role } from "@/lib/types";

export async function requireProfile(): Promise<{ profile: Profile; userId: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle<Profile>();

  if (!profile) redirect("/");

  return { profile, userId: user.id };
}

export async function requireRole(...roles: Role[]): Promise<{ profile: Profile }> {
  const { profile } = await requireProfile();
  if (!roles.includes(profile.role)) redirect(homeFor(profile.role));
  return { profile };
}

export function homeFor(role: Role): string {
  if (role === "admin") return "/app/admin";
  if (role === "leader") return "/app/lider";
  return "/app/cria";
}

/** Pesquisa de status: exigida uma vez por dia para líderes e crias. */
export async function needsStatusCheck(profile: Profile): Promise<boolean> {
  if (profile.role === "admin") return false;

  const supabase = await createClient();
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const { count } = await supabase
    .from("status_responses")
    .select("id", { count: "exact", head: true })
    .eq("user_id", profile.id)
    .gte("created_at", startOfDay.toISOString());

  return (count ?? 0) === 0;
}
