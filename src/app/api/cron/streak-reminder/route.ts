import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendPushToUsers } from "@/lib/push-server";
import { statusDayCutoffUTC } from "@/lib/auth";

export const dynamic = "force-dynamic";

/**
 * Aviso noturno de "perda visível evitável" (20h Brasília, agendada em
 * vercel.json): quem já tem uma ofensiva de status acesa e ainda não
 * respondeu hoje recebe um empurrão antes da virada do dia — ver a ofensiva
 * que já tem de propósito, prestes a quebrar, traz muito mais gente de volta
 * do que silêncio.
 */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret && request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "não autorizado" }, { status: 401 });
  }

  const supabase = createAdminClient();
  if (!supabase) {
    return NextResponse.json(
      { error: "SUPABASE_SERVICE_ROLE_KEY não configurada — lembrete desativado." },
      { status: 503 },
    );
  }

  const { data: candidates, error: candidatesError } = await supabase
    .from("profiles")
    .select("id, status_streak")
    .in("role", ["cria", "leader"])
    .gt("status_streak", 0);

  if (candidatesError) {
    return NextResponse.json({ error: candidatesError.message }, { status: 500 });
  }
  if (!candidates || candidates.length === 0) {
    return NextResponse.json({ ok: true, notified: 0 });
  }

  const ids = candidates.map((c) => c.id as string);
  const { data: answeredToday } = await supabase
    .from("status_responses")
    .select("user_id")
    .in("user_id", ids)
    .gte("created_at", statusDayCutoffUTC().toISOString());

  const answeredIds = new Set(((answeredToday ?? []) as { user_id: string }[]).map((r) => r.user_id));
  const atRisk = candidates.filter((c) => !answeredIds.has(c.id as string)) as {
    id: string;
    status_streak: number;
  }[];

  if (atRisk.length === 0) {
    return NextResponse.json({ ok: true, notified: 0 });
  }

  // agrupa por tamanho de ofensiva pra mandar a mensagem certa pra cada um
  const byStreak = new Map<number, string[]>();
  for (const c of atRisk) {
    if (!byStreak.has(c.status_streak)) byStreak.set(c.status_streak, []);
    byStreak.get(c.status_streak)!.push(c.id);
  }

  for (const [streak, userIds] of byStreak) {
    const title = `🔥 Sua ofensiva de ${streak} ${streak === 1 ? "dia" : "dias"} está em risco`;
    const body = "Responda o status de hoje até meia-noite pra não perder.";

    await supabase.from("notifications").insert(
      userIds.map((user_id) => ({ user_id, title, body, link: "/app/status", category: "streak" })),
    );
    await sendPushToUsers(userIds, { title, body, url: "/app/status" }, supabase);
  }

  return NextResponse.json({ ok: true, notified: atRisk.length });
}
