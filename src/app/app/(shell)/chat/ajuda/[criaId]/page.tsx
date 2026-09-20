import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui";
import { HelpChatPanel } from "@/components/chat/HelpChatPanel";
import type { HelpChatMessage } from "@/lib/types";

export default async function AjudaCriaPage({
  params,
}: {
  params: Promise<{ criaId: string }>;
}) {
  const { profile } = await requireRole("leader");
  const { criaId } = await params;
  const supabase = await createClient();

  const { data: link } = await supabase
    .from("leader_crias")
    .select("cria_id, profiles:cria_id(id, full_name, avatar_url)")
    .eq("leader_id", profile.id)
    .eq("cria_id", criaId)
    .maybeSingle();
  if (!link) notFound();

  const cria = (link as unknown as { profiles: { id: string; full_name: string; avatar_url: string | null } })
    .profiles;

  const { data: messages } = await supabase
    .from("help_chat_messages")
    .select("id, cria_id, sender_id, body, created_at")
    .eq("cria_id", criaId)
    .order("created_at", { ascending: true })
    .limit(500);

  return (
    <>
      <PageHeader
        title={`Ajuda — ${cria.full_name || "Cria"}`}
        subtitle={
          <Link href="/app/chat/ajuda" className="underline">
            Todas as conversas
          </Link>
        }
      />
      <HelpChatPanel
        criaId={criaId}
        headerTitle={cria.full_name || "Cria"}
        headerSubtitle="Conversa direta — só vocês dois e a administração veem."
        currentUserId={profile.id}
        participants={[
          { id: profile.id, full_name: profile.full_name, avatar_url: profile.avatar_url },
          cria,
        ]}
        initialMessages={(messages ?? []) as HelpChatMessage[]}
      />
    </>
  );
}
