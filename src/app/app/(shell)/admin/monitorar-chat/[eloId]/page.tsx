import Link from "next/link";
import { notFound } from "next/navigation";
import { ChatPanel } from "@/components/chat/ChatPanel";
import { PageHeader } from "@/components/ui";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { ChatMessage } from "@/lib/types";

export default async function MonitorarChatEloPage({
  params,
}: {
  params: Promise<{ eloId: string }>;
}) {
  await requireRole("admin");
  const { eloId } = await params;
  const supabase = await createClient();

  const { data: elo } = await supabase.from("elos").select("id, name").eq("id", eloId).maybeSingle();
  if (!elo) notFound();

  const [{ data: messages }, { data: participants }] = await Promise.all([
    supabase
      .from("chat_messages")
      .select("id, elo_id, sender_id, body, created_at")
      .eq("elo_id", eloId)
      .order("created_at", { ascending: true })
      .limit(500),
    supabase.from("profiles").select("id, full_name, avatar_url, role").eq("elo_id", eloId),
  ]);

  return (
    <>
      <PageHeader
        title="Monitorar Chat"
        subtitle={
          <>
            <Link href="/app/admin/monitorar-chat" className="underline">
              Todos os Elos
            </Link>{" "}
            / {elo.name}
          </>
        }
      />
      <ChatPanel
        eloId={elo.id}
        eloName={elo.name}
        currentUserId={null}
        participants={participants ?? []}
        initialMessages={(messages ?? []) as ChatMessage[]}
        readOnly
      />
    </>
  );
}
