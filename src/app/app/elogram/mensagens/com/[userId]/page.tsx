import { notFound, redirect } from "next/navigation";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { DmThread, type DmPerson } from "@/components/elogram/DmThread";

type Author = { id: string; full_name: string; username: string | null; avatar_url: string | null };

/** Abre a conversa com uma pessoa: se já existe, vai pra ela; senão mostra a conversa vazia (a 1ª mensagem cria). */
export default async function DmWithUserPage({ params }: { params: Promise<{ userId: string }> }) {
  const { userId } = await params;
  const { profile } = await requireProfile();
  if (profile.role !== "leader" && profile.role !== "cria") redirect("/app/elogram/mensagens");
  if (userId === profile.id) redirect("/app/elogram/mensagens");

  const supabase = await createClient();
  const a = profile.id < userId ? profile.id : userId;
  const b = profile.id < userId ? userId : profile.id;

  const { data: existing } = await supabase
    .from("dm_threads")
    .select("id")
    .eq("user_a", a)
    .eq("user_b", b)
    .maybeSingle<{ id: string }>();
  if (existing) redirect(`/app/elogram/mensagens/${existing.id}`);

  const { data: names } = await supabase.rpc("feed_author_names", { p_ids: [userId] });
  const target = ((names ?? []) as Author[])[0];
  if (!target) notFound();

  const other: DmPerson = {
    id: target.id,
    name: target.full_name || "Sem nome",
    username: target.username,
    avatar: target.avatar_url,
  };
  const me: DmPerson = {
    id: profile.id,
    name: profile.full_name || "Você",
    username: profile.username ?? null,
    avatar: profile.avatar_url,
  };

  return (
    <DmThread
      threadId={null}
      me={me}
      other={other}
      people={[me, other]}
      initialMessages={[]}
      readOnly={false}
      canDelete={false}
      backHref="/app/elogram/mensagens"
    />
  );
}
