import { PageHeader } from "@/components/ui";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { AnnouncementEditor, type AnnouncementRow } from "./AnnouncementEditor";
import { PushCampaignToggle } from "./PushCampaignToggle";

export default async function AdminAvisosPage() {
  await requireRole("admin");
  const supabase = await createClient();

  const [listRes, seenRes, usersRes, campaignRes, allIdsRes, subsRes] = await Promise.all([
    supabase
      .from("announcements")
      .select("id, title, body, active, version")
      .order("created_at", { ascending: false }),
    supabase.from("announcement_seen").select("announcement_id, seen_version"),
    supabase.from("profiles").select("id", { count: "exact", head: true }).neq("role", "admin"),
    supabase.from("push_activation_campaign").select("active").eq("id", true).maybeSingle(),
    supabase.from("profiles").select("id").neq("role", "admin"),
    supabase.from("push_subscriptions").select("user_id"),
  ]);

  const list = (listRes.data ?? []) as Omit<AnnouncementRow, "seenCount">[];
  const seen = (seenRes.data ?? []) as { announcement_id: string; seen_version: number }[];
  const rows: AnnouncementRow[] = list.map((a) => ({
    ...a,
    seenCount: seen.filter((s) => s.announcement_id === a.id && s.seen_version >= a.version).length,
  }));

  const withPush = new Set(((subsRes.data ?? []) as { user_id: string }[]).map((s) => s.user_id));
  const withoutPush = ((allIdsRes.data ?? []) as { id: string }[]).filter((p) => !withPush.has(p.id)).length;

  return (
    <>
      <PageHeader
        title="Avisos"
        subtitle="Um card que aparece pra cada usuário no próximo acesso, uma vez só. Ao editar, marque “mostrar de novo” pra reenviar."
      />
      <div className="space-y-3">
        <PushCampaignToggle active={campaignRes.data?.active ?? false} withoutPush={withoutPush} />
        <AnnouncementEditor totalUsers={usersRes.count ?? 0} />
        {rows.map((r) => (
          <AnnouncementEditor key={r.id} item={r} totalUsers={usersRes.count ?? 0} />
        ))}
      </div>
    </>
  );
}
