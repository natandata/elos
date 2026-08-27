import { ChatPanel } from "@/components/chat/ChatPanel";
import { EmptyState, PageHeader } from "@/components/ui";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { ChatMessage } from "@/lib/types";

export default async function ChatPage() {
  const { profile } = await requireRole("leader", "cria");
  const supabase = await createClient();

  if (!profile.elo_id) {
    return (
      <>
        <PageHeader title="Chat" subtitle="Converse com o seu Elo." />
        <EmptyState>Você ainda não pertence a nenhum Elo.</EmptyState>
      </>
    );
  }

  const [{ data: elo }, { data: messages }, { data: participants }] = await Promise.all([
    supabase.from("elos").select("name").eq("id", profile.elo_id).maybeSingle(),
    supabase
      .from("chat_messages")
      .select("id, elo_id, sender_id, body, created_at")
      .eq("elo_id", profile.elo_id)
      .order("created_at", { ascending: true })
      .limit(500),
    supabase
      .from("profiles")
      .select("id, full_name, avatar_url, role")
      .eq("elo_id", profile.elo_id),
  ]);

  return (
    <>
      <PageHeader title="Chat" subtitle={`Converse com o seu Elo — ${elo?.name ?? ""}`} />
      <ChatPanel
        eloId={profile.elo_id}
        eloName={elo?.name ?? "Elo"}
        currentUserId={profile.id}
        participants={participants ?? []}
        initialMessages={(messages ?? []) as ChatMessage[]}
      />
    </>
  );
}
