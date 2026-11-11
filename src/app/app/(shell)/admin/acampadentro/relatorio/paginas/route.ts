import { NextResponse } from "next/server";
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import { requireAcampadentroManager } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const TZ = "America/Sao_Paulo";
const W = 595.28;
const H = 841.89;
const M = 40;

// A fonte padrão do PDF só tem letras latinas: tira emojis e símbolos que ela não desenha.
const clean = (s: string) => Array.from(s).filter((c) => c.charCodeAt(0) <= 255).join("").replace(/\s+/g, " ").trim();

type Row = { user_id: string; file_path: string; file_name: string; status: string; uploaded_at: string };
const STATUS: Record<string, [string, [number, number, number]]> = {
  approved: ["Aprovado", [0.05, 0.5, 0.3]],
  pending: ["Aguardando aprovacao", [0.7, 0.45, 0]],
  rejected: ["Recusado", [0.75, 0.15, 0.15]],
};

/** Converte a imagem do comprovante em JPEG (gira pela orientação do celular e reduz o tamanho). Devolve null se não der. */
async function toJpeg(bytes: Uint8Array): Promise<Uint8Array | null> {
  try {
    const sharp = (await import("sharp")).default;
    const out = await sharp(Buffer.from(bytes)).rotate().flatten({ background: "#ffffff" }).resize({ width: 1600, height: 2200, fit: "inside", withoutEnlargement: true }).jpeg({ quality: 82 }).toBuffer();
    return new Uint8Array(out);
  } catch {
    return null;
  }
}

function header(page: PDFPage, bold: PDFFont, font: PDFFont, eventName: string, name: string, status: string, when: string, cont: boolean): number {
  const ink = rgb(0.09, 0.09, 0.11);
  const grey = rgb(0.4, 0.4, 0.45);
  let y = H - M;
  page.drawText(`COMPROVANTE DE PAGAMENTO  |  ${eventName.toUpperCase()}`, { x: M, y: y - 8, size: 8.5, font: bold, color: grey });
  y -= 40;
  let size = 28;
  const label = clean(name) || "Sem nome";
  while (size > 13 && bold.widthOfTextAtSize(label, size) > W - 2 * M) size -= 1;
  page.drawText(cont ? `${label} (cont.)` : label, { x: M, y, size, font: bold, color: ink });
  y -= 18;
  const [txt, col] = STATUS[status] ?? [status, [0.4, 0.4, 0.45] as [number, number, number]];
  page.drawText(txt, { x: M, y, size: 11, font: bold, color: rgb(col[0], col[1], col[2]) });
  page.drawText(`Enviado em ${when}`, { x: M + bold.widthOfTextAtSize(txt, 11) + 12, y, size: 10, font, color: grey });
  y -= 12;
  page.drawLine({ start: { x: M, y }, end: { x: W - M, y }, thickness: 1.2, color: ink });
  return y - 16;
}

/** PDF "Por página": uma pessoa por página, com o nome no topo e o comprovante embaixo. */
export async function GET() {
  await requireAcampadentroManager();
  const supabase = await createClient();
  const [payRes, profRes, setRes] = await Promise.all([
    supabase.from("acampadentro_payment").select("user_id, file_path, file_name, status, uploaded_at").in("status", ["pending", "approved", "rejected"]).limit(1000),
    supabase.from("profiles").select("id, full_name, is_test_account").in("role", ["cria", "leader"]).limit(2000),
    supabase.from("event_settings").select("name").eq("id", true).maybeSingle(),
  ]);
  const eventName = clean((setRes.data as { name?: string } | null)?.name || "Acampadentro") || "Acampadentro";
  const profs = new Map(((profRes.data ?? []) as { id: string; full_name: string; is_test_account: boolean | null }[]).map((p) => [p.id, p]));
  const rows = ((payRes.data ?? []) as Row[])
    .filter((r) => r.file_path && profs.has(r.user_id) && !profs.get(r.user_id)!.is_test_account)
    .sort((a, b) => clean(profs.get(a.user_id)!.full_name).localeCompare(clean(profs.get(b.user_id)!.full_name), "pt-BR"));

  // baixa os arquivos (poucos de cada vez)
  const files = new Map<string, Uint8Array | null>();
  for (let i = 0; i < rows.length; i += 6) {
    await Promise.all(
      rows.slice(i, i + 6).map(async (r) => {
        const { data } = await supabase.storage.from("payment_proofs").download(r.file_path);
        files.set(r.user_id, data ? new Uint8Array(await data.arrayBuffer()) : null);
      }),
    );
  }

  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const grey = rgb(0.4, 0.4, 0.45);

  for (const r of rows) {
    const name = profs.get(r.user_id)!.full_name;
    const when = new Date(r.uploaded_at).toLocaleString("pt-BR", { timeZone: TZ, day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
    const bytes = files.get(r.user_id);
    const isPdf = r.file_name.toLowerCase().endsWith(".pdf") || (!!bytes && bytes[0] === 0x25 && bytes[1] === 0x50);
    const note = (page: PDFPage, y: number, msg: string) => page.drawText(msg, { x: M, y, size: 11, font, color: grey });

    if (!bytes) {
      const page = pdf.addPage([W, H]);
      note(page, header(page, bold, font, eventName, name, r.status, when, false), "Nao foi possivel carregar o arquivo do comprovante.");
      continue;
    }
    if (isPdf) {
      // comprovante em PDF: cada página dele vira uma página aqui, sob o nome
      try {
        const src = await PDFDocument.load(bytes, { ignoreEncryption: true });
        const embedded = await pdf.embedPdf(src, src.getPageIndices());
        embedded.forEach((ep, idx) => {
          const page = pdf.addPage([W, H]);
          const top = header(page, bold, font, eventName, name, r.status, when, idx > 0);
          const box = { w: W - 2 * M, h: top - (M + 24) };
          const k = Math.min(box.w / ep.width, box.h / ep.height, 1.5);
          const w = ep.width * k;
          const h = ep.height * k;
          page.drawPage(ep, { x: M + (box.w - w) / 2, y: top - h, width: w, height: h });
        });
      } catch {
        const page = pdf.addPage([W, H]);
        note(page, header(page, bold, font, eventName, name, r.status, when, false), "Nao foi possivel abrir o PDF do comprovante.");
      }
      continue;
    }
    const jpg = await toJpeg(bytes);
    const page = pdf.addPage([W, H]);
    const top = header(page, bold, font, eventName, name, r.status, when, false);
    if (!jpg) {
      note(page, top, "Formato de imagem nao suportado neste relatorio.");
      continue;
    }
    const img = await pdf.embedJpg(jpg);
    const box = { w: W - 2 * M, h: top - (M + 24) };
    const k = Math.min(box.w / img.width, box.h / img.height, 1);
    const w = img.width * k;
    const h = img.height * k;
    page.drawImage(img, { x: M + (box.w - w) / 2, y: top - h, width: w, height: h });
  }

  if (rows.length === 0) {
    const page = pdf.addPage([W, H]);
    page.drawText("Nenhum comprovante enviado ate agora.", { x: M, y: H - M - 20, size: 12, font, color: grey });
  }
  const now = new Date();
  const dateStr = now.toLocaleDateString("pt-BR", { timeZone: TZ, day: "2-digit", month: "long", year: "numeric" });
  pdf.getPages().forEach((p, i, all) => p.drawText(`${eventName}  |  ${dateStr}  |  pagina ${i + 1} de ${all.length}`, { x: M, y: 22, size: 8, font, color: grey }));

  const out = await pdf.save();
  const stamp = new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(now);
  return new NextResponse(Buffer.from(out), {
    headers: { "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="comprovantes-por-pagina-${stamp}.pdf"`, "Cache-Control": "no-store" },
  });
}
