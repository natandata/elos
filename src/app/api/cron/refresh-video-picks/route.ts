import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendPushToUsers } from "@/lib/push-server";
import { VIDEO_SOURCE_LABEL, type VideoSource } from "@/lib/home/videos";

export const dynamic = "force-dynamic";

// Canais do card "Conteúdo relevante para a sua vida" que se renovam sozinhos (aba Vídeos pública do YouTube, sem chave de API).
const CHANNELS: { source: VideoSource; channelId: string }[] = [
  { source: "subira", channelId: "UCOaGUokN9ojuoqP-LYifS1Q" },
  { source: "luca", channelId: "UCeWnkKQmA0_q1YQ0YDxGELQ" },
  { source: "roberta", channelId: "UCm9zmU9pDBU5cHKntnqeGLw" },
];

/** Quando restarem poucos vídeos ainda não exibidos, buscamos novos. */
const LOW_WATER = 3;
const MAX_ADD = 8;

// Filtro de segurança para a faixa etária (12–17). Vídeos que batem aqui nunca entram sozinhos.
const BLOCK = [
  "sexo", "sexual", "porn", " nu ", " nua ", "pelad", "erotic", "aborto", "suicíd", "suicid", "estupro", "droga", "cocaína", "maconha",
  "política", "politica", "eleiç", "eleic", " voto ", " votar ", " lula ", "bolsonaro", "partido", "governo", " ao vivo ", " live ", "#shorts", "podcast completo",
  "diabo", "demônio", "demonio", "satan", "anticristo", "namor", "pessoa certa", "descobrir quem é",
  "casamento", "casal", "marido", "esposa", "gravidez", "grávida", "gestante", "parto", " bebê ", " bebe ", "maternidade", "amamenta",
];
// Extras só para a Roberta: os vlogs de casa e maternidade não são para adolescentes.
const BLOCK_ROBERTA = [" vlog ", " mãe ", " mae ", " filha ", " filho ", " filhos ", " receita ", "mounjaro", " casa ", " mudança "];

// Luca fala de muita coisa fora da fé (política, polêmicas, viagens): ele só entra sozinho se o título tiver vocabulário de fé.
const FAITH_WORDS = ["deus", "jesus", "cristo", "cristã", "cristão", "fé ", "bíblia", "versículo", "oração", "orar", "evangel", "igreja", "milagre", "espírito", "salmo", "amor"];

function blocked(source: VideoSource, title: string): boolean {
  const t = ` ${title.toLowerCase().replace(/[^\p{L}\p{N}#$@]+/gu, " ")} `;
  if (/[a-zà-ú][0-9$@][a-zà-ú]/i.test(t) || t.includes("$")) return true; // títulos "disfarçados" (s3xo, $exo, vid4)
  if (BLOCK.some((w) => t.includes(w))) return true;
  if (source === "roberta" && BLOCK_ROBERTA.some((w) => t.includes(w))) return true;
  if (source === "luca" && !FAITH_WORDS.some((w) => t.includes(w))) return true;
  return false;
}

function decode(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'");
}

function upperRatio(s: string): number {
  const letters = [...s].filter((c) => c.toLowerCase() !== c.toUpperCase());
  return letters.length ? letters.filter((c) => c === c.toUpperCase()).length / letters.length : 0;
}

/** Título legível: tira emojis, "| VLOG", vira frase quando vem tudo em maiúsculas. */
function cleanTitle(raw: string): string {
  let t = decode(raw)
    .replace(/\s*\|\s*VLOG/gi, "")
    .replace(/#\p{L}+/gu, "")
    .replace(/[\u{1F300}-\u{1FAFF}☀-➿⬀-⯿️]/gu, "")
    .replace(/\s+/g, " ")
    .trim();
  if (upperRatio(t) > 0.6) {
    t = t.toLowerCase().replace(/(^|[.!?]\s+)(\p{L})/gu, (_m, a: string, b: string) => a + b.toUpperCase());
    t = t.replace(/\b(deus|jesus|cristo|bíblia|espírito santo)\b/g, (w) => w.replace(/(^|\s)\p{L}/gu, (c) => c.toUpperCase()));
  } else {
    t = t.charAt(0).toUpperCase() + t.slice(1);
  }
  return t.replace(/(^|\s)porquê(?=\s)/gi, "$1por que").replace(/^por que/, "Por que").trim().slice(0, 160);
}

type FeedEntry = { id: string; title: string; seconds: number };

function toSeconds(text: string): number {
  return text.split(":").reduce((acc, p) => acc * 60 + Number(p), 0);
}

/** Aba "Vídeos" do canal (já sem Shorts): lê o ytInitialData da página. O feed RSS do YouTube falha para alguns canais. */
async function fetchChannelVideos(channelId: string): Promise<FeedEntry[]> {
  for (let attempt = 0; attempt < 3; attempt++) {
    const out = await fetchChannelVideosOnce(channelId);
    if (out.length > 0) return out;
  }
  return [];
}

async function fetchChannelVideosOnce(channelId: string): Promise<FeedEntry[]> {
  try {
    const res = await fetch(`https://www.youtube.com/channel/${channelId}/videos`, {
      cache: "no-store",
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36", "Accept-Language": "pt-BR,pt;q=0.9" },
    });
    if (!res.ok) return [];
    const html = await res.text();
    const raw = /var ytInitialData = (\{[\s\S]*?\});<\/script>/.exec(html)?.[1];
    if (!raw) return [];
    const out: FeedEntry[] = [];
    const walk = (o: unknown): void => {
      if (Array.isArray(o)) return o.forEach(walk);
      if (!o || typeof o !== "object") return;
      const rec = o as Record<string, unknown>;
      const lv = rec.lockupViewModel as { contentId?: string; contentType?: string; contentImage?: unknown; metadata?: { lockupMetadataViewModel?: { title?: { content?: string } } } } | undefined;
      if (lv?.contentId && lv.contentType === "LOCKUP_CONTENT_TYPE_VIDEO") {
        const title = lv.metadata?.lockupMetadataViewModel?.title?.content;
        const dur = /"text":"(\d+:\d{2}(?::\d{2})?)"/.exec(JSON.stringify(lv.contentImage ?? {}))?.[1];
        if (title && dur) out.push({ id: lv.contentId, title, seconds: toSeconds(dur) });
      }
      Object.values(rec).forEach(walk);
    };
    walk(JSON.parse(raw));
    return out;
  } catch {
    return [];
  }
}

/**
 * Renovação diária (00h de Brasília) da lista do card "Conteúdo relevante": quando um canal está com poucos vídeos
 * ainda não exibidos, traz os mais recentes do canal (sem Shorts e sem os temas bloqueados) e avisa o admin para revisar.
 */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret && request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "não autorizado" }, { status: 401 });
  }
  const supabase = createAdminClient();
  if (!supabase) return NextResponse.json({ error: "SUPABASE_SERVICE_ROLE_KEY não configurada." }, { status: 503 });

  const report: Record<string, { unseen: number; added: string[] }> = {};
  const notes: string[] = [];

  for (const ch of CHANNELS) {
    const { count: unseen } = await supabase
      .from("home_video_picks")
      .select("video_id", { count: "exact", head: true })
      .eq("source", ch.source)
      .eq("active", true)
      .is("last_shown", null);
    const left = unseen ?? 0;
    report[ch.source] = { unseen: left, added: [] };
    if (left > LOW_WATER) continue;

    const { data: known } = await supabase.from("home_video_picks").select("video_id").eq("source", ch.source);
    const have = new Set(((known ?? []) as { video_id: string }[]).map((r) => r.video_id));
    const { data: maxRow } = await supabase.from("home_video_picks").select("sort").order("sort", { ascending: false }).limit(1).maybeSingle<{ sort: number }>();
    let sort = (maxRow?.sort ?? 0) + 1;

    const feed = await fetchChannelVideos(ch.channelId);
    const rows: { source: string; video_id: string; title: string; sort: number; auto_added: boolean }[] = [];
    for (const e of feed) {
      if (rows.length >= MAX_ADD) break;
      if (have.has(e.id) || e.seconds < 180 || blocked(ch.source, e.title)) continue;
      rows.push({ source: ch.source, video_id: e.id, title: cleanTitle(e.title), sort: sort++, auto_added: true });
    }
    if (rows.length > 0) {
      const { error } = await supabase.from("home_video_picks").insert(rows);
      if (!error) {
        report[ch.source].added = rows.map((r) => r.title);
        notes.push(`${VIDEO_SOURCE_LABEL[ch.source]}: +${rows.length}`);
      }
    } else if (left <= 1) {
      notes.push(`${VIDEO_SOURCE_LABEL[ch.source]}: só ${left} vídeo(s) sobrando e nada novo no canal`);
    }
  }

  if (notes.length > 0) {
    const { data: admins } = await supabase.from("profiles").select("id").eq("role", "admin");
    const ids = ((admins ?? []) as { id: string }[]).map((a) => a.id);
    await sendPushToUsers(ids, { title: "🎬 Conteúdo relevante renovado", body: `${notes.join(" · ")}. Revise na tabela home_video_picks.`, url: "/app/admin" }, supabase);
  }

  return NextResponse.json({ ok: true, report });
}
