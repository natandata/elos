import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui";
import { HelpChatPanel } from "@/components/chat/HelpChatPanel";
import type { HelpChatMessage } from "@/lib/types";

export default async function AdminAjudaCriaPage({
  params,
}: {
  params: Promise<{ criaId: string }>;
}) {
  await requireRole("admin");
  const { criaId } = await params;
  const supabase = await createClient();

  const { data: cria } = await supabase
    .from("profiles")
    .select("id, full_name, avatar_url")
    .eq("id", criaId)
    .maybeSingle<{ id: string; full_name: string; avatar_url: string | null }>();
  if (!cria) notFound();

  const [{ data: messages }, { data: leaders }] = await Promise.all([
    supabase
      .from("help_chat_messages")
      .select("id, cria_id, sender_id, body, created_at")
      .eq("cria_id", criaId)
      .order("created_at", { ascending: true })
      .limit(500),
    supabase.from("leader_crias").select("profiles:leader_id(id, full_name, avatar_url)").eq("cria_id", criaId),
  ]);

  const leaderProfiles = ((leaders ?? []) as unknown as {
    profiles: { id: string; full_name: string; avatar_url: string | null } | null;
  }[])
    .map((r) => r.profiles)
    .filter((p): p is { id: string; full_name: string; avatar_url: string | null } => Boolean(p));

  return (
    <>
      <PageHeader
        title={`Ajuda — ${cria.full_name || "Cria"}`}
        subtitle={
          <Link href="/app/admin/ajuda" className="underline">
            Todas as conversas
          </Link>
        }
      />
      <HelpChatPanel
        criaId={criaId}
        headerTitle={cria.full_name || "Cria"}
        headerSubtitle="Monitoramento — somente leitura. Você pode excluir mensagens."
        currentUserId={null}
        participants={[cria, ...leaderProfiles]}
        initialMessages={(messages ?? []) as HelpChatMessage[]}
        readOnly
        canDelete
      />
    </>
  );
}
