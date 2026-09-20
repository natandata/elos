import Link from "next/link";
import { Card, EmptyState, PageHeader } from "@/components/ui";
import { Avatar } from "@/components/Avatar";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { HelpChatPanel } from "@/components/chat/HelpChatPanel";
import { formatDateTime, type HelpChatMessage } from "@/lib/types";

export default async function AjudaPage() {
  const { profile } = await requireRole("leader", "cria");
  const supabase = await createClient();

  if (profile.role === "cria") {
    const [{ data: messages }, { data: leaders }] = await Promise.all([
      supabase
        .from("help_chat_messages")
        .select("id, cria_id, sender_id, body, created_at")
        .eq("cria_id", profile.id)
        .order("created_at", { ascending: true })
        .limit(500),
      profile.elo_id
        ? supabase.from("profiles").select("id, full_name, avatar_url").eq("elo_id", profile.elo_id).eq("role", "leader")
        : Promise.resolve({ data: [] }),
    ]);

    return (
      <>
        <PageHeader
          title="Preciso de ajuda"
          subtitle={
            <>
              <Link href="/app/chat" className="underline">
                Chat do Elo
              </Link>{" "}
              · conversa direta com {profile.role === "cria" ? "seu líder" : "o cria"}
            </>
          }
        />
        <HelpChatPanel
          criaId={profile.id}
          headerTitle="Conversa com o líder"
          headerSubtitle="Só você, seu(s) líder(es) e a administração veem essa conversa."
          currentUserId={profile.id}
          participants={[
            { id: profile.id, full_name: profile.full_name, avatar_url: profile.avatar_url },
            ...((leaders ?? []) as { id: string; full_name: string; avatar_url: string | null }[]),
          ]}
          initialMessages={(messages ?? []) as HelpChatMessage[]}
        />
      </>
    );
  }

  // líder: lista os próprios crias, com prévia da última mensagem de cada um
  const { data: links } = await supabase
    .from("leader_crias")
    .select("profiles:cria_id(id, full_name, avatar_url)")
    .eq("leader_id", profile.id);

  const crias = ((links ?? []) as unknown as {
    profiles: { id: string; full_name: string; avatar_url: string | null } | null;
  }[])
    .map((r) => r.profiles)
    .filter((p): p is { id: string; full_name: string; avatar_url: string | null } => Boolean(p));

  const criaIds = crias.map((c) => c.id);
  const { data: lastMessages } = criaIds.length
    ? await supabase
        .from("help_chat_messages")
        .select("cria_id, body, created_at")
        .in("cria_id", criaIds)
        .order("created_at", { ascending: false })
    : { data: [] };

  const lastByCria = new Map<string, { body: string; created_at: string }>();
  (lastMessages ?? []).forEach((m) => {
    if (!lastByCria.has(m.cria_id)) lastByCria.set(m.cria_id, { body: m.body, created_at: m.created_at });
  });

  return (
    <>
      <PageHeader
        title="Preciso de ajuda"
        subtitle={
          <>
            <Link href="/app/chat" className="underline">
              Chat do Elo
            </Link>{" "}
            · conversas individuais com seus crias
          </>
        }
      />
      {crias.length === 0 ? (
        <EmptyState>Nenhum cria vinculado ainda.</EmptyState>
      ) : (
        <div className="space-y-2">
          {crias.map((c) => {
            const last = lastByCria.get(c.id);
            return (
              <Link key={c.id} href={`/app/chat/ajuda/${c.id}`} className="block">
                <Card className="flex items-center gap-3 transition hover:-translate-y-0.5">
                  <Avatar url={c.avatar_url} name={c.full_name} size={36} />
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold">{c.full_name || "Sem nome"}</p>
                    <p className="truncate text-xs text-[var(--muted)]">
                      {last ? `${last.body} · ${formatDateTime(last.created_at)}` : "Sem mensagens ainda"}
                    </p>
                  </div>
                  <span className="text-[var(--muted)]" aria-hidden>
                    →
                  </span>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </>
  );
}
