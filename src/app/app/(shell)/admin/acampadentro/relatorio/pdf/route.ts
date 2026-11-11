import { NextResponse, type NextRequest } from "next/server";
import { PDFArray, PDFDocument, PDFName, PDFString, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import { requireAcampadentroManager } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const TZ = "America/Sao_Paulo";

// A fonte padrão do PDF só tem letras latinas: tira emojis e símbolos que ela não desenha.
const clean = (s: string) => Array.from(s).filter((c) => c.charCodeAt(0) <= 255).join("").replace(/\s+/g, " ").trim();
function fit(text: string, font: PDFFont, size: number, max: number): string {
  let t = clean(text);
  if (font.widthOfTextAtSize(t, size) <= max) return t;
  while (t.length > 1 && font.widthOfTextAtSize(t + "...", size) > max) t = t.slice(0, -1);
  return t + "...";
}

/** Relatório de comprovantes do Acampadentro em PDF, gerado na hora (data/hora de emissão). Pode ser emitido quantas vezes quiser. */
export async function GET(req: NextRequest) {
  await requireAcampadentroManager();
  const supabase = await createClient();
  const [payRes, profRes, setRes] = await Promise.all([
    supabase.from("acampadentro_payment").select("user_id, file_name, status, uploaded_at, pay_date").in("status", ["pending", "approved", "waived", "later"]).limit(1000),
    supabase.from("profiles").select("id, full_name, is_test_account").in("role", ["cria", "leader"]).limit(2000),
    supabase.from("event_settings").select("name").eq("id", true).maybeSingle(),
  ]);
  const eventName = clean((setRes.data as { name?: string } | null)?.name || "Acampadentro") || "Acampadentro";
  const profs = new Map(((profRes.data ?? []) as { id: string; full_name: string; is_test_account: boolean | null }[]).map((p) => [p.id, p]));
  const rows = ((payRes.data ?? []) as { user_id: string; file_name: string; status: string; uploaded_at: string; pay_date: string | null }[])
    .filter((r) => profs.has(r.user_id) && !profs.get(r.user_id)!.is_test_account)
    .sort((a, b) => Number(a.status === "waived" || a.status === "later") - Number(b.status === "waived" || b.status === "later") || Number(a.status === "waived") - Number(b.status === "waived") || a.uploaded_at.localeCompare(b.uploaded_at));
  const approved = rows.filter((r) => r.status === "approved").length;
  const waived = rows.filter((r) => r.status === "waived").length;
  const later = rows.filter((r) => r.status === "later").length;

  const now = new Date();
  const dateStr = now.toLocaleDateString("pt-BR", { timeZone: TZ, day: "2-digit", month: "long", year: "numeric" });
  const timeStr = now.toLocaleTimeString("pt-BR", { timeZone: TZ, hour: "2-digit", minute: "2-digit" });
  const origin = req.nextUrl.origin;

  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const W = 595.28;
  const H = 841.89;
  const M = 40;
  const ink = rgb(0.09, 0.09, 0.11);
  const grey = rgb(0.4, 0.4, 0.45);
  const blue = rgb(0.1, 0.3, 0.8);
  const cols = { n: M, name: M + 24, date: M + 190, time: M + 258, status: M + 298, link: M + 390 };

  const annots = new Map<PDFPage, ReturnType<typeof pdf.context.register>[]>();
  const addLink = (page: PDFPage, x: number, y: number, w: number, h: number, url: string) => {
    const ref = pdf.context.register(pdf.context.obj({ Type: "Annot", Subtype: "Link", Rect: [x, y, x + w, y + h], Border: [0, 0, 0], A: { Type: "Action", S: "URI", URI: PDFString.of(url) } }));
    annots.set(page, [...(annots.get(page) ?? []), ref]);
  };

  let page = pdf.addPage([W, H]);
  let y = H - M;
  const header = () => {
    page.drawRectangle({ x: M, y: y - 6, width: W - 2 * M, height: 20, color: rgb(0.93, 0.93, 0.95) });
    const t = (s: string, x: number) => page.drawText(s, { x: x + 3, y: y, size: 8.5, font: bold, color: grey });
    t("#", cols.n);
    t("NOME", cols.name);
    t("DATA DE ENVIO", cols.date);
    t("HORA", cols.time);
    t("SITUAÇÃO", cols.status);
    t("IMAGEM (OU DOCUMENTO)", cols.link);
    y -= 24;
  };

  page.drawText("RELATÓRIO DE COMPROVANTES DE PAGAMENTO", { x: M, y, size: 9, font: bold, color: grey });
  y -= 30;
  page.drawText(eventName, { x: M, y, size: 28, font: bold, color: ink });
  y -= 20;
  page.drawText(`Emitido em ${dateStr} às ${timeStr}`, { x: M, y, size: 11, font, color: ink });
  y -= 15;
  page.drawText(`${rows.length - waived - later} comprovante(s) recebido(s)  |  ${approved} aprovado(s)  |  ${rows.length - waived - later - approved} aguardando  |  ${waived} isento(s)  |  ${later} pagto. futuro`, { x: M, y, size: 9, font, color: grey });
  y -= 12;
  page.drawLine({ start: { x: M, y }, end: { x: W - M, y }, thickness: 1.5, color: ink });
  y -= 24;
  header();

  rows.forEach((r, i) => {
    if (y < M + 30) {
      page = pdf.addPage([W, H]);
      y = H - M;
      header();
    }
    const isWaived = r.status === "waived" || r.status === "later";
    const isLater = r.status === "later";
    const when = new Date(r.uploaded_at);
    const pdfFile = r.file_name.toLowerCase().endsWith(".pdf");
    page.drawText(String(i + 1), { x: cols.n + 3, y, size: 10, font, color: grey });
    page.drawText(fit(profs.get(r.user_id)!.full_name || "Sem nome", bold, 10, 156), { x: cols.name + 3, y, size: 10, font: bold, color: ink });
    page.drawText(isWaived ? "-" : when.toLocaleDateString("pt-BR", { timeZone: TZ }), { x: cols.date + 3, y, size: 10, font, color: ink });
    page.drawText(isWaived ? "-" : when.toLocaleTimeString("pt-BR", { timeZone: TZ, hour: "2-digit", minute: "2-digit" }), { x: cols.time + 3, y, size: 10, font, color: ink });
    page.drawText(isLater ? "Pagto. futuro" : isWaived ? "Isento" : r.status === "approved" ? "Aprovado" : "Aguardando", { x: cols.status + 3, y, size: 9.5, font: bold, color: isWaived ? rgb(0.1, 0.4, 0.7) : r.status === "approved" ? rgb(0.05, 0.5, 0.3) : rgb(0.7, 0.45, 0) });
    if (isWaived) {
      page.drawText(isLater ? (r.pay_date ? `Pagará em ${r.pay_date.split("-").reverse().join("/")}` : "Data a definir") : "Isento pelo admin", { x: cols.link + 3, y, size: 9, font, color: grey });
      page.drawLine({ start: { x: M, y: y - 8 }, end: { x: W - M, y: y - 8 }, thickness: 0.4, color: rgb(0.85, 0.85, 0.88) });
      y -= 24;
      return;
    }
    const label = pdfFile ? "Abrir documento (PDF)" : "Abrir imagem";
    const lw = font.widthOfTextAtSize(label, 10);
    page.drawText(label, { x: cols.link + 3, y, size: 10, font, color: blue });
    page.drawLine({ start: { x: cols.link + 3, y: y - 1.5 }, end: { x: cols.link + 3 + lw, y: y - 1.5 }, thickness: 0.6, color: blue });
    addLink(page, cols.link + 3, y - 3, lw, 14, `${origin}/app/admin/acampadentro/comprovante/${r.user_id}`);
    page.drawLine({ start: { x: M, y: y - 8 }, end: { x: W - M, y: y - 8 }, thickness: 0.4, color: rgb(0.85, 0.85, 0.88) });
    y -= 24;
  });
  if (rows.length === 0) page.drawText("Nenhum comprovante enviado até agora.", { x: M, y, size: 11, font, color: grey });

  pdf.getPages().forEach((p, i, all) => {
    const refs = annots.get(p);
    if (refs?.length) p.node.set(PDFName.of("Annots"), pdf.context.obj(refs) as PDFArray);
    p.drawText(`${eventName}  |  ${dateStr}  |  página ${i + 1} de ${all.length}`, { x: M, y: 22, size: 8, font, color: grey });
  });

  const bytes = await pdf.save();
  const stamp = new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(now);
  return new NextResponse(Buffer.from(bytes), {
    headers: { "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="relatorio-acampadentro-${stamp}.pdf"`, "Cache-Control": "no-store" },
  });
}
