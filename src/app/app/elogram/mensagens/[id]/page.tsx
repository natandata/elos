import { notFound } from "next/navigation";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { DmThread, type DmMessage, type DmPerson } from "@/components/elogram/DmThread";

type Author = { id: string; full_name: string; username: string | null; avatar_url: string | null };

export default async function DmThreadPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { profile } = await requireProfile();
  const supabase = await createClient();

  // a regra do banco só entrega a conversa pra quem participa ou pra liderança
  const { data: thread } = await supabase
    .from("dm_threads")
    .select("id, user_a, user_b")
    .eq("id", id)
    .maybeSingle<{ id: string; user_a: string; user_b: string }>();
  if (!thread) notFound();

  const [{ data: names }, { data: msgs }] = await Promise.all([
    supabase.rpc("feed_author_names", { p_ids: [thread.user_a, thread.user_b] }),
    supabase
      .from("dm_messages")
      .select("id, sender_id, body, created_at")
      .eq("thread_id", id)
      .is("deleted_at", null)
      .order("created_at", { ascending: true })
      .limit(300),
  ]);

  const toPerson = (a: Author): DmPerson => ({
    id: a.id,
    name: a.full_name || "Sem nome",
    username: a.username,
    avatar: a.avatar_url,
  });
  const people = ((names ?? []) as Author[]).map(toPerson);
  const mine = profile.id === thread.user_a || profile.id === thread.user_b;
  const me: DmPerson = {
    id: profile.id,
    name: profile.full_name || "Você",
    username: profile.username ?? null,
    avatar: profile.avatar_url,
  };
  const other = mine ? (people.find((p) => p.id !== profile.id) ?? null) : null;
  const monitor = profile.role === "admin" || profile.role === "leader";

  return (
    <DmThread
      key={id}
      threadId={id}
      me={me}
      other={other}
      people={people}
      initialMessages={(msgs ?? []) as DmMessage[]}
      readOnly={!mine}
      canDelete={monitor}
      backHref={mine ? "/app/elogram/mensagens" : "/app/elogram/mensagens/todas"}
    />
  );
}
