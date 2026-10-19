// Texto da Bíblia NVI, direto da YouVersion Platform (licença Biblica "Fast-track Bible License"). Só roda no servidor:
// a chave (YVP_APP_KEY) nunca vai para o código do navegador.
//
// Regras da licença que este módulo respeita:
//  - o texto NÃO é guardado no nosso banco nem em arquivo; só o cache HTTP de 1 h que a própria API autoriza;
//  - um capítulo por tela (o limite é 2 capítulos ou 25 versículos por vez, por pessoa);
//  - o aviso de copyright da versão é sempre exibido junto do texto (getAttribution).
// O app é gratuito e sem anúncios, como declarado no cadastro da plataforma.

const BASE = "https://api.youversion.com/v1";
/** NVI em português (Biblica). */
export const NVI_ID = 129;
const REVALIDATE = 3600;

function appKey(): string | null {
  return process.env.YVP_APP_KEY?.trim() || null;
}

const clean = (s: string) => s.replace(/­/g, "").trim();

export type Chapter = { html: string; reference: string };

/** Capítulo em HTML (estrutura da própria YouVersion). Devolve null se a chave faltar ou a API falhar. */
export async function getChapter(bookId: string, chapter: number): Promise<Chapter | null> {
  const key = appKey();
  if (!key) return null;
  try {
    const res = await fetch(`${BASE}/bibles/${NVI_ID}/passages/${bookId}.${chapter}?format=html&include_headings=true&include_notes=false`, {
      headers: { "X-YVP-App-Key": key },
      next: { revalidate: REVALIDATE },
    });
    if (!res.ok) return null;
    const j = (await res.json()) as { content?: string; reference?: string };
    if (!j.content) return null;
    return { html: j.content, reference: clean(j.reference ?? `${bookId} ${chapter}`) };
  } catch {
    return null;
  }
}

/** Aviso de copyright da versão: obrigatório junto do texto. */
export async function getAttribution(): Promise<string> {
  const fallback = "Bíblia Sagrada, Nova Versão Internacional®, NVI® © 1993, 2000, 2011, 2023 por Biblica, Inc. Usado com permissão. Todos os direitos reservados mundialmente.";
  const key = appKey();
  if (!key) return fallback;
  try {
    const res = await fetch(`${BASE}/bibles/${NVI_ID}`, { headers: { "X-YVP-App-Key": key }, next: { revalidate: REVALIDATE } });
    if (!res.ok) return fallback;
    const j = (await res.json()) as { copyright?: string; promotional_content?: string };
    const text = clean(j.copyright ?? "") || clean(j.promotional_content ?? "");
    // o aviso vem em português e em inglês, uma linha por idioma: mostramos o português
    const pt = text.split("\n").slice(0, 3).join(" ").trim();
    return pt || fallback;
  } catch {
    return fallback;
  }
}

/** Fonte da Bíblia (Untitled Serif): a YouVersion exige carregar por este endereço, sem hospedar o arquivo. */
export function fontStylesheetHref(): string | null {
  const key = appKey();
  return key ? `${BASE}/fonts/1/stylesheet?app_key=${encodeURIComponent(key)}` : null;
}

export const BIBLE_CSS_HREF = "https://cdn.youversion.com/platform/1/bible.css";
