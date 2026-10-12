import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendPushToUsers } from "@/lib/push-server";
import { hasMentionAll, mentionIds, plainMentions } from "@/lib/mentions";

/** Quantas pessoas dá pra marcar de uma vez (evita virar spam). */
export const MAX_MENTIONS_POST = 5;
export const MAX_MENTIONS_CHAT = 10;

type Target = { id: string; role: string; approved: boolean; elo_id: string | null };

function snippet(text: string, max = 90): string {
  const plain = plainMentions(text).replace(/\s+/g, " ").trim();
  return plain.length > max ? `${plain.slice(0, max)}…` : plain;
}

/** Só pessoas que existem, recebem avisos (líder aprovado ou cria) e, se `eloId` vier, são do mesmo Elo. */
async function validTargets(ids: string[], senderId: string, eloId?: string | null): Promise<Target[]> {
  const admin = createAdminClient();
  const wanted = ids.filter((id) => id !== senderId);
  if (!admin || wanted.length === 0) return [];
  let q = admin.from("profiles").select("id, role, approved, elo_id").in("id", wanted).in("role", ["leader", "cria"]);
  if (eloId) q = q.eq("elo_id", eloId);
  const { data } = await q;
  return ((data ?? []) as Target[]).filter((t) => t.role !== "leader" || t.approved);
}

async function insertNotifications(userIds: string[], title: string, body: string, link: string) {
  const admin = createAdminClient();
  if (!admin || userIds.length === 0) return;
  await admin
    .from("notifications")
    .insert(userIds.map((user_id) => ({ user_id, title, body, link, category: "mencao" })));
}

/**
 * Marcação numa legenda ou comentário do Elogram: avisa as pessoas marcadas (sino do ELOS, aba de
 * atividade do Elogram e push). `skip` = pessoas já avisadas antes (ex.: legenda editada).
 */
export async function notifyElogramMentions(opts: {
  text: string;
  senderId: string;
  senderName: string;
  postId: string;
  inComment: boolean;
  skip?: string[];
}): Promise<void> {
  const { text, senderId, senderName, postId, inComment, skip = [] } = opts;
  const ids = mentionIds(text)
    .filter((id) => !skip.includes(id))
    .slice(0, MAX_MENTIONS_POST);
  const targets = await validTargets(ids, senderId);
  if (targets.length === 0) return;
  const admin = createAdminClient();
  if (!admin) return;

  const userIds = targets.map((t) => t.id);
  await admin.from("elogram_mentions").insert(
    userIds.map((target_id) => ({
      post_id: postId,
      target_id,
      author_id: senderId,
      in_comment: inComment,
      body: snippet(text, 200),
    })),
  );

  const link = `/app/elogram/post/${postId}`;
  const title = inComment ? `${senderName} marcou você num comentário` : `${senderName} marcou você numa publicação`;
  const body = snippet(text);
  await insertNotifications(userIds, title, body, link);
  await sendPushToUsers(userIds, { title, body, url: link });
}

/** Marcação no chat do Elo: pessoas marcadas (só do mesmo Elo) ou todo mundo do Elo com @todos. */
export async function notifyChatMentions(opts: {
  text: string;
  senderId: string;
  senderName: string;
  eloId: string;
}): Promise<void> {
  const { text, senderId, senderName, eloId } = opts;
  const admin = createAdminClient();
  if (!admin) return;

  let userIds: string[] = [];
  let title: string;
  if (hasMentionAll(text)) {
    const { data } = await admin
      .from("profiles")
      .select("id, role, approved")
      .eq("elo_id", eloId)
      .in("role", ["leader", "cria"]);
    userIds = ((data ?? []) as { id: string; role: string; approved: boolean }[])
      .filter((p) => p.id !== senderId && (p.role !== "leader" || p.approved))
      .map((p) => p.id);
    title = `${senderName} marcou todos no chat do Elo`;
  } else {
    const targets = await validTargets(mentionIds(text).slice(0, MAX_MENTIONS_CHAT), senderId, eloId);
    userIds = targets.map((t) => t.id);
    title = `${senderName} marcou você no chat do Elo`;
  }
  if (userIds.length === 0) return;

  const body = snippet(text);
  await insertNotifications(userIds, title, body, "/app/chat");
  await sendPushToUsers(userIds, { title, body, url: "/app/chat" });
}
