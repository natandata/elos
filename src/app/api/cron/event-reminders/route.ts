import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendPushToUsers } from "@/lib/push-server";

export const dynamic = "force-dynamic";

const DAYS_BEFORE = [3, 1] as const;

// Fuso fixo (Brasília é UTC-3 o ano inteiro) — mesmo padrão usado em
// requireProfile/record_status_streak, pra "3 dias antes" bater com o
// calendário que a pessoa vê na tela, não com a data UTC do servidor.
function todayBR(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(`${dateStr}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/**
 * Lembretes de agenda (08:00 Brasília, agendado em vercel.json).
 *
 * Pra cada evento que cai daqui a 3 dias ou daqui a 1 dia, notifica quem
 * pode participar dele (mesma regra de quem vê o evento na Agenda) e tem
 * push ativado. event_reminder_log evita mandar o mesmo lembrete duas vezes
 * se o cron rodar de novo no mesmo dia.
 */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret && request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "não autorizado" }, { status: 401 });
  }

  const supabase = createAdminClient();
  if (!supabase) {
    return NextResponse.json(
      { error: "SUPABASE_SERVICE_ROLE_KEY não configurada — lembretes desativados." },
      { status: 503 },
    );
  }

  const today = todayBR();
  const results: Record<string, { event: string; notified: number }[]> = {};

  for (const daysBefore of DAYS_BEFORE) {
    const targetDate = addDays(today, daysBefore);
    const key = `${daysBefore}d`;
    results[key] = [];

    const { data: events } = await supabase
      .from("events")
      .select("id, title, event_date, elo_id, leaders_only")
      .eq("event_date", targetDate);

    for (const event of events ?? []) {
      // já mandou esse lembrete pra esse evento? não manda de novo
      const { data: alreadySent } = await supabase
        .from("event_reminder_log")
        .select("event_id")
        .eq("event_id", event.id)
        .eq("days_before", daysBefore)
        .maybeSingle();
      if (alreadySent) continue;

      // audiência: mesma regra de quem enxerga o evento na tela de Agenda —
      // "Liderança" só líderes/admin, um Elo específico só quem é daquele
      // Elo, "Todos os ELOS" todo mundo (inclusive responsáveis).
      let audienceQuery = supabase.from("profiles").select("id");
      if (event.leaders_only) {
        audienceQuery = audienceQuery.in("role", ["leader", "admin"]);
      } else if (event.elo_id) {
        audienceQuery = audienceQuery.eq("elo_id", event.elo_id);
      }
      const { data: audience } = await audienceQuery;
      const userIds = (audience ?? []).map((p) => p.id as string);
      if (userIds.length === 0) continue;

      // só quem tem push ativado ("notificações ativadas") recebe
      const { data: subs } = await supabase
        .from("push_subscriptions")
        .select("user_id")
        .in("user_id", userIds);
      const notifyIds = Array.from(new Set((subs ?? []).map((s) => s.user_id as string)));
      if (notifyIds.length === 0) {
        await supabase.from("event_reminder_log").insert({ event_id: event.id, days_before: daysBefore });
        continue;
      }

      const dateLabel = new Date(`${event.event_date}T00:00:00Z`).toLocaleDateString("pt-BR", {
        timeZone: "UTC",
      });
      const title = daysBefore === 1 ? "Evento amanhã" : `Evento em ${daysBefore} dias`;
      const body = `${event.title} — ${dateLabel}`;

      await supabase
        .from("notifications")
        .insert(notifyIds.map((user_id) => ({ user_id, title, body, category: "agenda" })));

      await sendPushToUsers(notifyIds, { title, body, url: "/app/agenda" });

      await supabase.from("event_reminder_log").insert({ event_id: event.id, days_before: daysBefore });
      results[key].push({ event: event.title, notified: notifyIds.length });
    }
  }

  return NextResponse.json({ ok: true, results });
}
