import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendPushToUsers } from "@/lib/push-server";

export const dynamic = "force-dynamic";

/**
 * Quinta (agendada em vercel.json): lembra quem joga o Vista o Herói de que o Mega Desfile é amanhã, às 19h.
 * Só quem já jogou alguma vez recebe, e contas de teste ficam de fora.
 */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret && request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "não autorizado" }, { status: 401 });
  }
  const supabase = createAdminClient();
  if (!supabase) return NextResponse.json({ error: "SUPABASE_SERVICE_ROLE_KEY não configurada." }, { status: 503 });

  const { data: stats } = await supabase.from("dress_stats").select("user_id").limit(2000);
  const ids = ((stats ?? []) as { user_id: string }[]).map((r) => r.user_id);
  if (ids.length === 0) return NextResponse.json({ ok: true, notified: 0 });
  const { data: ok } = await supabase.from("profiles").select("id").in("id", ids).eq("is_test_account", false).in("role", ["cria", "leader", "admin"]);
  const to = ((ok ?? []) as { id: string }[]).map((p) => p.id);
  if (to.length === 0) return NextResponse.json({ ok: true, notified: 0 });

  const title = "🎆 Amanhã tem Mega Desfile!";
  const body = "Sexta às 19h, no Vista o Herói. Prêmio em dobro para o pódio. O salão de espera abre às 18h30!";
  const url = "/app/jogos/vestir";
  await supabase.from("notifications").insert(to.map((user_id) => ({ user_id, title, body, link: url, category: "jogos" })));
  await sendPushToUsers(to, { title, body, url }, supabase);
  return NextResponse.json({ ok: true, notified: to.length });
}
