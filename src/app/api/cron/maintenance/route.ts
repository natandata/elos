import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

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
