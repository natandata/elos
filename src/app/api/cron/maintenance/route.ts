import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendPushToUsers } from "@/lib/push-server";
import { isReleased } from "@/lib/games/release";

export const dynamic = "force-dynamic";

/**
 * Manutenção noturna (04:00 Brasília, agendada em vercel.json).
 *
 * Remove do Storage os arquivos que ficaram sem post correspondente — sobra
 * de fotos do Explorar/Stories que expiraram em 24h. Isso não pode ser feito
 * pelo pg_cron: o Supabase bloqueia apagar arquivo por SQL, só a Storage API
 * remove de verdade. E como não há usuário logado às 4h, a rotina precisa da
 * chave de serviço.
 */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret && request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "não autorizado" }, { status: 401 });
  }

  const supabase = createAdminClient();
  if (!supabase) {
    return NextResponse.json(
      { error: "SUPABASE_SERVICE_ROLE_KEY não configurada — limpeza automática desativada." },
      { status: 503 },
    );
  }

  // Acerta o XP de criação de missão dos líderes: quem ficou com menos de
  // 50% dos crias aprovados até o prazo perde os 5 XP que ganhou ao criar.
  const { error: settleError } = await supabase.rpc("settle_leader_mission_xp");
  if (settleError) console.error("settle_leader_mission_xp falhou:", settleError);

  // Arena dos Heróis: quem ficou dias sem devocional perde 25% dos troféus por dia sem anotar
  const { data: penalized, error: penaltyError } = await supabase.rpc("arena_devotional_penalties");
  if (penaltyError) console.error("arena_devotional_penalties falhou:", penaltyError);
  for (const p of (penalized ?? []) as { user_id: string; lost: number; missed_days: number }[]) {
    const title = "📖 Sem devocional, menos troféus";
    const body = `${p.missed_days === 1 ? "Você ficou 1 dia" : `Você ficou ${p.missed_days} dias`} sem o devocional e perdeu ${p.lost} 🏆 na Arena dos Heróis (25% por dia). Faça o devocional todo dia!`;
    try {
      await supabase.from("notifications").insert({ user_id: p.user_id, title, body, link: "/app/devocional", category: "jogos" });
      await sendPushToUsers([p.user_id], { title, body, url: "/app/devocional" });
    } catch {
      // aviso é secundário
    }
  }

  // Lançamento do Vista o Herói (09/10/2026): avisa todo mundo uma única vez, no dia da liberação
  const brToday = new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
  if (isReleased("dress") && brToday === "2026-10-09") {
    const title = "👗 Novo jogo: Vista o Herói!";
    const body = "Vista os heróis da Bíblia do jeito certo e junte Bilhetes Dourados. Já está liberado na sala de jogos!";
    const { data: already } = await supabase.from("notifications").select("id").eq("title", title).limit(1);
    if (!already || already.length === 0) {
      const { data: users } = await supabase.from("profiles").select("id").in("role", ["cria", "leader"]).eq("approved", true).neq("is_test_account", true);
      const ids = ((users ?? []) as { id: string }[]).map((u) => u.id);
      if (ids.length > 0) {
        await supabase.from("notifications").insert(ids.map((id) => ({ user_id: id, title, body, link: "/app/jogos/vestir", category: "jogos" })));
        await sendPushToUsers(ids, { title, body, url: "/app/jogos/vestir" }).catch(() => null);
      }
    }
  }

  // Passarela do Vista o Herói: fecha os dias cuja votação já acabou (tema de D vota em D e D+1; fecha em D+2)
  if (isReleased("dress")) {
    const base = new Date(`${brToday}T00:00:00Z`);
    base.setUTCDate(base.getUTCDate() - 2);
    const cutoff = base.toISOString().slice(0, 10);
    const { data: pending } = await supabase.from("dress_runway_looks").select("theme_date").lte("theme_date", cutoff);
    const { data: done } = await supabase.from("dress_runway_days").select("theme_date");
    const settled = new Set(((done ?? []) as { theme_date: string }[]).map((d) => d.theme_date));
    const toSettle = [...new Set(((pending ?? []) as { theme_date: string }[]).map((p) => p.theme_date))].filter((d) => !settled.has(d)).sort();
    for (const day of toSettle) {
      const { data: res, error: settleErr } = await supabase.rpc("dress_runway_settle", { p_date: day });
      if (settleErr) {
        console.error("dress_runway_settle falhou:", settleErr);
        continue;
      }
      for (const r of (res ?? []) as { user_id: string; kind: string; place: number | null; tickets: number }[]) {
        const title = r.kind === "place" ? `📸 Passarela: você ficou em ${r.place}º!` : "📸 Passarela: obrigado pelos votos!";
        const body = r.kind === "place" ? `Seu look foi um dos mais votados e rendeu ${r.tickets} 🎫 Bilhetes Dourados.` : `Seus votos na Passarela renderam ${r.tickets} 🎫 Bilhetes Dourados.`;
        try {
          await supabase.from("notifications").insert({ user_id: r.user_id, title, body, link: "/app/jogos/vestir/passarela", category: "jogos" });
          await sendPushToUsers([r.user_id], { title, body, url: "/app/jogos/vestir/passarela" });
        } catch {
          // aviso é secundário
        }
      }
    }
  }

  // com a chave de serviço a RLS não se aplica, então dá pra achar os órfãos
  // com uma consulta direta em vez da RPC (que é escopada por usuário).
  const buckets = ["feed", "stories", "profile_gallery"] as const;
  const [feed, stories, gallery] = await Promise.all([
    supabase.from("feed_posts").select("image_path"),
    supabase.from("story_posts").select("image_path"),
    supabase.from("profile_gallery_posts").select("image_path"),
  ]);
  const alive = new Set(
    [...(feed.data ?? []), ...(stories.data ?? []), ...(gallery.data ?? [])].map(
      (r: { image_path: string }) => r.image_path,
    ),
  );

  let removed = 0;
  const details: Record<string, number> = {};

  for (const bucket of buckets) {
    const orphans: string[] = [];
    // lista por pasta de usuário (a API do Storage não lista recursivamente)
    const { data: folders } = await supabase.storage.from(bucket).list("", { limit: 1000 });
    for (const folder of folders ?? []) {
      const { data: files } = await supabase.storage
        .from(bucket)
        .list(folder.name, { limit: 1000 });
      for (const f of files ?? []) {
        const path = `${folder.name}/${f.name}`;
        if (!alive.has(path)) orphans.push(path);
      }
    }
    if (orphans.length > 0) {
      const { data: deleted } = await supabase.storage.from(bucket).remove(orphans);
      details[bucket] = deleted?.length ?? 0;
      removed += deleted?.length ?? 0;
    } else {
      details[bucket] = 0;
    }
  }

  return NextResponse.json({ ok: true, removed, details });
}
