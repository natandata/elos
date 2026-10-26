import { redirect } from "next/navigation";
import { AppShell, type NavItem } from "@/components/shell/AppShell";
import { ThemeSetter } from "@/components/shell/ThemeSetter";
import { ViewAsBanner } from "@/components/shell/ViewAsBanner";
import { AnnouncementModal, type ActiveAnnouncement } from "@/components/announcements/AnnouncementModal";
import { ComebackModal, type ComebackOffer } from "@/components/announcements/ComebackModal";
import { BirthdayModal } from "@/components/announcements/BirthdayModal";
import { GenerosityPoll } from "@/components/announcements/GenerosityPoll";
import { needsGuardianAck, needsStatusCheck, requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ROLE_LABEL } from "@/lib/types";

const NAV: Record<string, NavItem[]> = {
  admin: [
    { href: "/app/admin", label: "Dashboard", icon: "📊" },
    { href: "/app/mural", label: "Mural de Sugestões", icon: "💡" },
    { href: "/app/admin/ajuda", label: "Pedidos de Ajuda", icon: "🆘" },
    { href: "/app/admin/avisos", label: "Avisos", icon: "📣" },
    { href: "/app/admin/retencao", label: "Retenção", icon: "📈" },
    { href: "/app/admin/babel-conversas", label: "Conversas do Babel", icon: "🎤" },
    {
      href: "/app/admin/jogos",
      label: "Sala de Jogos",
      icon: "🎮",
      children: [
        { href: "/app/admin/jogos", label: "Testar jogos", icon: "🕹️" },
        { href: "/app/admin/torneios", label: "Torneios da Arena", icon: "🏆" },
        { href: "/app/admin/arena", label: "Arena hoje", icon: "🏰" },
        { href: "/app/admin/passarela", label: "Passarela", icon: "📸" },
      ],
    },
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
        { href: "/app/admin/elos/historico", label: "Histórico de XP", icon: "📜" },
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
    { href: "/app/elogram", label: "Elogram", icon: "📸" },
    { href: "/app/spotcria", label: "Spot Cria", icon: "🎧" },
  ],
  leader: [
    {
      href: "/app/lider",
      label: "Início",
      icon: "🏠",
      children: [{ href: "/app/devocional", label: "Meu Devocional", icon: "📖" }],
    },
    {
      href: "/app/ranking",
      label: "Meu Elo",
      icon: "🏆",
      children: [
        { href: "/app/lider/missoes", label: "Missões", icon: "🎯" },
        { href: "/app/lider/historico", label: "Histórico de XP", icon: "📜" },
        { href: "/app/chat", label: "Chat", icon: "💬" },
        { href: "/app/lider/status-crias", label: "Status Crias", icon: "💛" },
        { href: "/app/lider/devocional-crias", label: "Devocional Crias", icon: "📖" },
      ],
    },
    {
      href: "/app/agenda",
      label: "Agenda",
      icon: "📅",
      children: [{ href: "/app/eventos", label: "Eventos", icon: "🎬" }],
    },
    { href: "/app/biblia", label: "Bíblia", icon: "📕" },
    { href: "/app/elogram", label: "Elogram", icon: "📸" },
    { href: "/app/spotcria", label: "Spot Cria", icon: "🎧" },
    { href: "/app/jogos", label: "Sala de Jogos", icon: "🎮" },
  ],
  cria: [
    {
      href: "/app/cria",
      label: "Início",
      icon: "🏠",
      children: [
        { href: "/app/devocional", label: "Meu Devocional", icon: "📖" },
        { href: "/app/mural", label: "Mural de Sugestões", icon: "💡" },
      ],
    },
    {
      href: "/app/ranking",
      label: "Meu Elo",
      icon: "🏆",
      children: [
        { href: "/app/cria/missoes", label: "Missões", icon: "🎯" },
        { href: "/app/chat", label: "Chat", icon: "💬" },
      ],
    },
    { href: "/app/agenda", label: "Agenda", icon: "📅" },
    { href: "/app/biblia", label: "Bíblia", icon: "📕" },
    { href: "/app/elogram", label: "Elogram", icon: "📸" },
    { href: "/app/spotcria", label: "Spot Cria", icon: "🎧" },
    { href: "/app/jogos", label: "Sala de Jogos", icon: "🎮" },
  ],
  guardian: [
    { href: "/app/elogram", label: "Elogram", icon: "📸" },
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
      ? supabase.from("elos").select("name, gender, age_range").eq("id", profile.elo_id).maybeSingle()
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
        .select("id, title, body, version, audience")
        .eq("active", true)
        // aviso sem Elo vale pra todo mundo; com Elo, só pra quem é desse Elo
        .or(profile.elo_id ? `elo_id.is.null,elo_id.eq.${profile.elo_id}` : "elo_id.is.null")
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
    // aviso com público (ex.: quem zerou a campanha da Arena) só aparece pra quem se encaixa
    let doneCampaign: boolean | null = null;
    const isDoneCampaign = async () => {
      if (doneCampaign === null) {
        const { count } = await supabase
          .from("arena_campaign_progress")
          .select("stage", { count: "exact", head: true })
          .eq("user_id", profile.id)
          .gte("tiers", 3);
        doneCampaign = (count ?? 0) >= 8;
      }
      return doneCampaign;
    };
    // aviso "targeted": só vale pra quem está em announcement_targets (ex.: troféus devolvidos)
    let targeted: Set<string> | null = null;
    const isTargeted = async (id: string) => {
      if (targeted === null) {
        const { data } = await supabase.from("announcement_targets").select("announcement_id").eq("user_id", profile.id);
        targeted = new Set(((data ?? []) as { announcement_id: string }[]).map((r) => r.announcement_id));
      }
      return targeted.has(id);
    };
    for (const a of (annRes.data ?? []) as (ActiveAnnouncement & { audience: string | null })[]) {
      if ((seenVersion.get(a.id) ?? 0) >= a.version) continue;
      if (a.audience === "campaign_done" && !(await isDoneCampaign())) continue;
      if (a.audience === "targeted" && !(await isTargeted(a.id))) continue;
      announcement = { id: a.id, title: a.title, body: a.body, version: a.version };
      break;
    }
  }

  // Cartão de boas-vindas (estratégia de retorno ativada pelo admin): aparece antes dos avisos, até ser resgatado ou vencer
  let comeback: ComebackOffer | null = null;
  if (!viewingAs && !pending && profile.role !== "admin") {
    const { data: offer } = await supabase
      .from("comeback_offers")
      .select("id, title, body, cta_label, cta_href, reward_xp")
      .eq("user_id", profile.id)
      .is("claimed_at", null)
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle<ComebackOffer>();
    comeback = offer ?? null;
  }

  // Pesquisa única do Elo Masculino 16–17 ("Você gostaria de ser mais generoso?"): só crias desse Elo, uma vez por pessoa
  let generosity: { others: number } | null = null;
  const eloInfo = eloRes.data as { name: string; gender?: string; age_range?: string } | null;
  if (!viewingAs && !pending && profile.role === "cria" && eloInfo?.gender === "male" && eloInfo?.age_range === "16-17") {
    const [{ data: answered }, { count: eloCount }] = await Promise.all([
      supabase.from("elo_surveys").select("user_id").eq("user_id", profile.id).eq("survey", "generosidade").maybeSingle(),
      supabase.from("elos").select("id", { count: "exact", head: true }),
    ]);
    if (!answered) generosity = { others: Math.max(0, (eloCount ?? 1) - 1) };
  }

  const chatUnread = chatUnreadRes.count ?? 0;
  // selo de mensagens não lidas no Chat, esteja ele no topo ou dentro de um grupo
  const withChatBadge = (item: NavItem): NavItem => ({
    ...item,
    ...(item.href === "/app/chat" ? { badge: chatUnread } : {}),
    ...(item.children ? { children: item.children.map(withChatBadge) } : {}),
  });
  const navItems = (NAV[profile.role] ?? NAV.cria).map(withChatBadge);

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
      {!viewingAs && !profile.birth_date ? <BirthdayModal /> : null}
      {comeback && profile.birth_date ? <ComebackModal key={comeback.id} offer={comeback} /> : null}
      {announcement && !comeback && profile.birth_date ? (
        <AnnouncementModal key={`${announcement.id}-${announcement.version}`} announcement={announcement} />
      ) : null}
      {generosity && !announcement && !comeback && profile.birth_date ? <GenerosityPoll others={generosity.others} /> : null}
    </>
  );
}
