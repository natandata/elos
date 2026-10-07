// ArenaSoccer · Mundo aberto: as notícias mais importantes da semana no mundo da bola (só manchete, fonte e link).

export type NewsItem = { title: string; source: string; url: string; at: number };

const QUERIES = ["futebol", "Champions League", "Copa do Mundo seleção", "transferência futebol", "Seleção Brasileira"];

/** Grandes jogadores, técnicos e times: quanto mais aparecem na manchete, mais importante a notícia. */
const BIG: [RegExp, number][] = [
  [/\b(messi|cristiano ronaldo|cr7|mbapp[eé]|haaland|vin[ií]cius j[uú]nior|vini jr|neymar|lamine yamal|yamal|bellingham)\b/i, 4],
  [/\b(salah|kane|rodrygo|endrick|raphinha|de bruyne|modri[cć]|pedri|musiala|saka|lewandowski|ancelotti|guardiola|mourinho|klopp|ten hag|arne slot|hansi flick)\b/i, 2.5],
  [/\b(real madrid|barcelona|manchester city|manchester united|liverpool|arsenal|chelsea|bayern|psg|paris saint-germain|juventus|milan|inter de mil[aã]o|atl[eé]tico de madrid)\b/i, 3],
  [/\b(flamengo|palmeiras|corinthians|s[aã]o paulo|santos|botafogo|fluminense|gr[eê]mio|internacional|cruzeiro|atl[eé]tico-mg|vasco)\b/i, 2],
  [/\b(sele[cç][aã]o brasileira|sele[cç][aã]o|argentina|fran[cç]a|inglaterra|alemanha|espanha|portugal|copa do mundo|champions league|libertadores|bal[aã]o de ouro)\b/i, 2.5],
  [/\b(final|t[ií]tulo|campe[aã]o|recorde|transfer[eê]ncia|contrata|renova|les[aã]o|demite|demiss[aã]o|acerta|hist[oó]rico)\b/i, 1.5],
  [/\b(sorteio|cassino|aposta|bet|hor[óo]scopo|ingresso)\b/i, -4],
  [/\b(the noite|podcast|programa|document[aá]rio|quiz|fotos|trajet[oó]ria|momentos que|relembre|biografia|fala sobre)\b/i, -3],
];

const dec = (s: string) =>
  s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .trim();

const tag = (block: string, t: string) => dec(block.match(new RegExp(`<${t}[^>]*>([\\s\\S]*?)</${t}>`))?.[1] ?? "");

async function fetchQuery(q: string): Promise<NewsItem[]> {
  const url = `https://news.google.com/rss/search?q=${encodeURIComponent(`${q} when:7d`)}&hl=pt-BR&gl=BR&ceid=BR:pt-419`;
  try {
    const res = await fetch(url, { next: { revalidate: 3600 }, signal: AbortSignal.timeout(8000) });
    if (!res.ok) return [];
    const xml = await res.text();
    return [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].slice(0, 25).flatMap((m) => {
      const raw = tag(m[1], "title");
      const source = tag(m[1], "source") || raw.split(" - ").pop() || "";
      const title = raw.endsWith(` - ${source}`) ? raw.slice(0, -(source.length + 3)) : raw;
      const link = tag(m[1], "link");
      const at = Date.parse(tag(m[1], "pubDate"));
      return title && link.startsWith("http") && Number.isFinite(at) ? [{ title, source, url: link, at }] : [];
    });
  } catch {
    return [];
  }
}

const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9 ]/g, " ");

/** As 3 notícias mais importantes da semana: prioriza grandes times e grandes jogadores, sem repetir o assunto. */
export async function topFootballNews(now = Date.now()): Promise<NewsItem[]> {
  const all = (await Promise.all(QUERIES.map(fetchQuery))).flat().filter((n) => now - n.at < 7 * 86_400_000 && n.at <= now + 3600_000);
  const scored = all
    .map((n) => ({ n, score: BIG.reduce((a, [re, w]) => a + (re.test(n.title) ? w : 0), 0) + Math.max(0, 1 - (now - n.at) / (7 * 86_400_000)) }))
    .filter((x) => x.score >= 3)
    .sort((a, b) => b.score - a.score);
  const out: NewsItem[] = [];
  for (const { n } of scored) {
    const words = new Set(norm(n.title).split(" ").filter((w) => w.length > 3));
    const dup = out.some((o) => {
      const ow = norm(o.title).split(" ").filter((w) => w.length > 3);
      return ow.filter((w) => words.has(w)).length >= Math.min(3, Math.ceil(ow.length / 3));
    });
    if (!dup) out.push(n);
    if (out.length === 3) break;
  }
  return out;
}
