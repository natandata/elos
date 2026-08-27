import { redirect } from "next/navigation";
import { AppShell, type NavItem } from "@/components/shell/AppShell";
import { needsStatusCheck, requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ROLE_LABEL } from "@/lib/types";

const NAV: Record<string, NavItem[]> = {
  admin: [
    { href: "/app/admin", label: "Dashboard", icon: "📊" },
    { href: "/app/admin/status-equipe", label: "Status Equipe", icon: "💛" },
    { href: "/app/admin/usuarios", label: "Usuários", icon: "👥" },
    { href: "/app/admin/elos", label: "ELOS", icon: "🔗" },
    { href: "/app/admin/missoes", label: "Missões", icon: "🎯" },
    { href: "/app/admin/monitorar-chat", label: "Monitorar Chat", icon: "🛰️" },
    { href: "/app/agenda", label: "Agenda", icon: "📅" },
  ],
  leader: [
    { href: "/app/lider", label: "Início", icon: "🏠" },
    { href: "/app/lider/status-crias", label: "Status Crias", icon: "💛" },
    { href: "/app/lider/missoes", label: "Missões", icon: "🎯" },
    { href: "/app/chat", label: "Chat", icon: "💬" },
    { href: "/app/ranking", label: "Ranking", icon: "🏆" },
    { href: "/app/agenda", label: "Agenda", icon: "📅" },
  ],
  cria: [
    { href: "/app/cria", label: "Início", icon: "🏠" },
    { href: "/app/cria/missoes", label: "Missões", icon: "🎯" },
    { href: "/app/chat", label: "Chat", icon: "💬" },
    { href: "/app/ranking", label: "Ranking", icon: "🏆" },
    { href: "/app/agenda", label: "Agenda", icon: "📅" },
  ],
};

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { profile } = await requireProfile();

  // Google Auth não traz gênero/idade: completa o cadastro antes de seguir.
  if (profile.role !== "admin" && (!profile.gender || !profile.age_range)) {
    redirect("/app/completar-perfil");
  }

  // Líder pendente não exerce nada ainda: a conta abre em modo bloqueado.
  const pending = profile.role === "leader" && !profile.approved;

  // Pesquisa diária de status (líder e cria) antes de liberar o restante.
  if (!pending && (await needsStatusCheck(profile))) redirect("/app/status");

  const supabase = await createClient();

  const canChat = profile.role !== "admin" && !!profile.elo_id;

  const [eloRes, unreadRes, chatUnreadRes] = await Promise.all([
    profile.elo_id
      ? supabase.from("elos").select("name").eq("id", profile.elo_id).maybeSingle()
      : Promise.resolve({ data: null }),
    supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("read", false),
    canChat
      ? supabase
          .from("chat_messages")
          .select("id", { count: "exact", head: true })
          .eq("elo_id", profile.elo_id!)
          .neq("sender_id", profile.id)
          .gt("created_at", profile.chat_last_read_at ?? "1970-01-01")
      : Promise.resolve({ count: 0 }),
  ]);

  const chatUnread = chatUnreadRes.count ?? 0;
  const navItems = (NAV[profile.role] ?? NAV.cria).map((item) =>
    item.href === "/app/chat" ? { ...item, badge: chatUnread } : item,
  );

  return (
    <AppShell
      items={navItems}
      name={profile.full_name || "Participante"}
      roleLabel={ROLE_LABEL[profile.role]}
      eloName={(eloRes.data as { name: string } | null)?.name ?? null}
      avatarUrl={profile.avatar_url}
      unread={unreadRes.count ?? 0}
      pending={pending}
    >
      {children}
    </AppShell>
  );
}
