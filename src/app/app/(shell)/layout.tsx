import { redirect } from "next/navigation";
import { AppShell, type NavItem } from "@/components/shell/AppShell";
import { ThemeSetter } from "@/components/shell/ThemeSetter";
import { ViewAsBanner } from "@/components/shell/ViewAsBanner";
import { AnnouncementModal, type ActiveAnnouncement } from "@/components/announcements/AnnouncementModal";
import { needsGuardianAck, needsStatusCheck, requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ROLE_LABEL } from "@/lib/types";

const NAV: Record<string, NavItem[]> = {
  admin: [
    { href: "/app/admin", label: "Dashboard", icon: "📊" },
    { href: "/app/mural", label: "Mural de Sugestões", icon: "💡" },
    { href: "/app/admin/ajuda", label: "Pedidos de Ajuda", icon: "🆘" },
    { href: "/app/admin/avisos", label: "Avisos", icon: "📣" },
    {
      label: "Status Geral",
      icon: "💛",
      children: [
        { href: "/app/admin/status-equipe", label: "Status Equipe", icon: "💛" },
        { href: "/app/lider/status-crias", label: "Status Crias", icon: "🧒" },
        { href: "/app/admin/devocional", label: "Devocional", icon: "📖" },
      ],
    },
    {
      href: "/app/admin/elos",
      label: "ELOS",
      icon: "🔗",
      children: [
        { href: "/app/admin/usuarios", label: "Usuários", icon: "👥" },
        { href: "/app/admin/missoes", label: "Missões", icon: "🎯" },
        { href: "/app/admin/monitorar-chat", label: "Monitorar Chat", icon: "🛰️" },
      ],
    },
    {
      href: "/app/admin/relatorio",
      label: "Relatório",
      icon: "📈",
      children: [
        { href: "/app/admin/geral", label: "Geral", icon: "🧭" },
        { href: "/app/admin/auditoria", label: "Auditoria", icon: "🗂️" },
      ],
    },
    { href: "/app/agenda", label: "Agenda", icon: "📅" },
    { href: "/app/eventos", label: "Eventos", icon: "🎬" },
    { href: "/app/admin/igreja", label: "Igreja 3D", icon: "⛪" },
    { href: "/app/feed", label: "Explorar", icon: "📸" },
  ],
  leader: [
    { href: "/app/lider", label: "Início", icon: "🏠" },
    { href: "/app/ranking", label: "Meu Elo", icon: "🏆" },
    { href: "/app/lider/missoes", label: "Missões", icon: "🎯" },
    { href: "/app/devocional", label: "Meu Devocional", icon: "📖" },
    { href: "/app/agenda", label: "Agenda", icon: "📅" },
    { href: "/app/eventos", label: "Eventos", icon: "🎬" },
    { href: "/app/chat", label: "Chat", icon: "💬" },
    { href: "/app/feed", label: "Explorar", icon: "📸" },
    { href: "/app/lider/status-crias", label: "Status Crias", icon: "💛" },
  ],
  cria: [
    { href: "/app/cria", label: "Início", icon: "🏠" },
    { href: "/app/mural", label: "Mural de Sugestões", icon: "💡" },
    { href: "/app/ranking", label: "Meu Elo", icon: "🏆" },
    { href: "/app/cria/missoes", label: "Missões", icon: "🎯" },
    { href: "/app/devocional", label: "Meu Devocional", icon: "📖" },
    { href: "/app/agenda", label: "Agenda", icon: "📅" },
    { href: "/app/chat", label: "Chat", icon: "💬" },
    { href: "/app/feed", label: "Explorar", icon: "📸" },
  ],
  guardian: [
    { href: "/app/feed", label: "Explorar", icon: "📸" },
    { href: "/app/ranking-crias", label: "Ranking Geral de Crias", icon: "🏆" },
    { href: "/app/pedidos-oracao", label: "Pedidos de Oração", icon: "🙏" },
    { href: "/app/agenda", label: "Agenda", icon: "📅" },
  ],
};

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { profile, viewingAs } = await requireProfile();

  // Google Auth não traz gênero/idade: completa o cadastro antes de seguir.
  // Responsável nunca tem gênero/idade/Elo — não se aplica a ele.
  if (
    profile.role !== "admin" &&
    profile.role !== "guardian" &&
    (!profile.gender || !profile.age_range)
  ) {
    redirect("/app/completar-perfil");
  }

  // Autorização do responsável: pedida no cadastro, revalidada a cada 15 dias.
  if (needsGuardianAck(profile)) redirect("/app/responsavel");

  // Líder pendente não exerce nada ainda: a conta abre em modo bloqueado.
  const pending = profile.role === "leader" && !profile.approved;

  // Pesquisa diária de status (líder e cria) antes de liberar o restante —
  // não se aplica durante "visualizar como": o admin só está olhando a
  // conta, não é ele quem deve responder o status do dia por ela.
  if (!viewingAs && !pending && (await needsStatusCheck(profile))) redirect("/app/status");

  const supabase = await createClient();

  const canChat = profile.role !== "admin" && !!profile.elo_id;

  const [eloRes, unreadRes, chatUnreadRes] = await Promise.all([
    profile.elo_id
      ? supabase.from("elos").select("name").eq("id", profile.elo_id).maybeSingle()
      : Promise.resolve({ data: null }),
    supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", profile.id)
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

  // Aviso do admin: mostra o mais antigo ainda não visto (na versão atual).
  // Não aparece pro admin, em "visualizar como" nem pra líder pendente.
  let announcement: ActiveAnnouncement | null = null;
  if (!viewingAs && !pending && profile.role !== "admin") {
    const [annRes, seenRes] = await Promise.all([
      supabase
        .from("announcements")
        .select("id, title, body, version")
        .eq("active", true)
        .order("created_at", { ascending: true }),
      supabase
        .from("announcement_seen")
        .select("announcement_id, seen_version")
        .eq("user_id", profile.id),
    ]);
    const seenVersion = new Map(
      ((seenRes.data ?? []) as { announcement_id: string; seen_version: number }[]).map((s) => [
        s.announcement_id,
        s.seen_version,
      ]),
    );
    announcement =
      ((annRes.data ?? []) as ActiveAnnouncement[]).find(
        (a) => (seenVersion.get(a.id) ?? 0) < a.version,
      ) ?? null;
  }

  const chatUnread = chatUnreadRes.count ?? 0;
  const navItems = (NAV[profile.role] ?? NAV.cria).map((item) =>
    item.href === "/app/chat" ? { ...item, badge: chatUnread } : item,
  );

  // líder homem tem cor própria (vermelho); líder mulher mantém o rosa,
  // igual às crias — só o líder homem sai do amarelo padrão masculino
  let theme = "neutral";
  if (profile.role === "leader" && profile.gender === "male") theme = "leader";
  else if (profile.role !== "admin" && profile.gender) theme = profile.gender;

  return (
    <>
      <ThemeSetter theme={theme} />
      {viewingAs ? <ViewAsBanner targetName={viewingAs.targetName} /> : null}
      <AppShell
        items={navItems}
        name={profile.full_name || "Participante"}
        roleLabel={ROLE_LABEL[profile.role]}
        eloName={(eloRes.data as { name: string } | null)?.name ?? null}
        avatarUrl={profile.avatar_url}
        unread={unreadRes.count ?? 0}
        pending={pending}
        role={profile.role}
        showOnboarding={!profile.onboarding_completed_at}
      >
        {children}
      </AppShell>
      {announcement ? (
        <AnnouncementModal key={`${announcement.id}-${announcement.version}`} announcement={announcement} />
      ) : null}
    </>
  );
}
