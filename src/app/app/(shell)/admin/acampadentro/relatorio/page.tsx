import Link from "next/link";
import { PrintButton } from "@/components/event/PrintButton";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Acampadentro · relatório de comprovantes" };
export const dynamic = "force-dynamic";

const STATUS: Record<string, string> = { pending: "Aguardando aprovação", approved: "Aprovado" };

/** Relatório de comprovantes de pagamento do Acampadentro. Gerado na hora (data/hora de emissão) e pode ser emitido quantas vezes quiser. */
export default async function AcampadentroReportPage() {
  await requireRole("admin");
  const supabase = await createClient();
  const [payRes, profRes, setRes] = await Promise.all([
    supabase.from("acampadentro_payment").select("user_id, file_path, file_name, status, uploaded_at").in("status", ["pending", "approved"]).limit(1000),
    supabase.from("profiles").select("id, full_name, role, is_test_account").in("role", ["cria", "leader"]).limit(2000),
    supabase.from("event_settings").select("name, event_date").eq("id", true).maybeSingle(),
  ]);
  const eventName = (setRes.data as { name?: string } | null)?.name || "Acampadentro";
  const profs = new Map(((profRes.data ?? []) as { id: string; full_name: string; role: string; is_test_account: boolean | null }[]).map((p) => [p.id, p]));
  const rows = ((payRes.data ?? []) as { user_id: string; file_path: string; file_name: string; status: string; uploaded_at: string }[])
    .filter((r) => profs.has(r.user_id) && !profs.get(r.user_id)!.is_test_account)
    .sort((a, b) => a.uploaded_at.localeCompare(b.uploaded_at));
  const signed = rows.length ? await supabase.storage.from("payment_proofs").createSignedUrls(rows.map((r) => r.file_path), 3600) : { data: [] };
  const urlOf = new Map((signed.data ?? []).map((s) => [s.path, s.signedUrl]));

  const tz = "America/Sao_Paulo";
  const now = new Date();
  const emitted = `${now.toLocaleDateString("pt-BR", { timeZone: tz, day: "2-digit", month: "long", year: "numeric" })} às ${now.toLocaleTimeString("pt-BR", { timeZone: tz, hour: "2-digit", minute: "2-digit" })}`;
  const approved = rows.filter((r) => r.status === "approved").length;

  return (
    <>
      <style>{`@media print { body * { visibility: hidden; } #relatorio, #relatorio * { visibility: visible; } #relatorio { position: absolute; left: 0; top: 0; width: 100%; } .no-break { break-inside: avoid; } @page { margin: 12mm; } }`}</style>
      <div className="mb-3 flex flex-wrap items-center gap-2 print:hidden">
        <Link href="/app/admin/acampadentro" className="rounded-xl border-2 border-[var(--line)] px-3 py-2 text-sm font-extrabold">
          ← Voltar
        </Link>
        <PrintButton />
        <p className="text-xs font-semibold text-[var(--muted)]">Atualize a página para emitir um novo relatório com a data e a hora de agora.</p>
      </div>

      <article id="relatorio" className="mx-auto max-w-4xl rounded-2xl bg-white p-6 text-neutral-900 shadow">
        <header className="border-b-2 border-neutral-900 pb-3">
          <p className="text-xs font-bold uppercase tracking-widest text-neutral-500">Relatório de comprovantes de pagamento</p>
          <h1 className="mt-1 text-3xl font-black">{eventName}</h1>
          <p className="mt-1 text-sm font-semibold text-neutral-600">Emitido em {emitted}</p>
          <p className="mt-1 text-sm font-semibold text-neutral-600">
            {rows.length} comprovante(s) recebido(s) · {approved} aprovado(s) · {rows.length - approved} aguardando aprovação
          </p>
        </header>

        <table className="mt-4 w-full border-collapse text-left text-sm">
          <thead>
            <tr className="bg-neutral-100 text-xs uppercase tracking-wide text-neutral-600">
              <th className="w-8 px-2 py-2">#</th>
              <th className="px-2 py-2">Nome</th>
              <th className="px-2 py-2">Data de envio</th>
              <th className="px-2 py-2">Hora</th>
              <th className="px-2 py-2">Situação</th>
              <th className="px-2 py-2">Comprovante</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => {
              const when = new Date(r.uploaded_at);
              const url = urlOf.get(r.file_path);
              const pdf = r.file_path.toLowerCase().endsWith(".pdf");
              return (
                <tr key={r.user_id} className="no-break border-b border-neutral-200 align-top">
                  <td className="px-2 py-2 font-bold text-neutral-500">{i + 1}</td>
                  <td className="px-2 py-2 font-extrabold">{profs.get(r.user_id)!.full_name || "Sem nome"}</td>
                  <td className="px-2 py-2 tabular-nums">{when.toLocaleDateString("pt-BR", { timeZone: tz })}</td>
                  <td className="px-2 py-2 tabular-nums">{when.toLocaleTimeString("pt-BR", { timeZone: tz, hour: "2-digit", minute: "2-digit" })}</td>
                  <td className="px-2 py-2 text-xs font-bold">{STATUS[r.status] ?? r.status}</td>
                  <td className="px-2 py-2">
                    {url && !pdf ? (
                      <a href={url} target="_blank" rel="noreferrer">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={url} alt={`Comprovante de ${profs.get(r.user_id)!.full_name}`} className="max-h-56 w-40 rounded border border-neutral-300 object-contain" />
                      </a>
                    ) : url ? (
                      <a href={url} target="_blank" rel="noreferrer" className="font-bold underline">
                        📄 PDF: {r.file_name || "abrir comprovante"}
                      </a>
                    ) : (
                      <span className="text-neutral-400">indisponível</span>
                    )}
                  </td>
                </tr>
              );
            })}
            {rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-2 py-6 text-center font-semibold text-neutral-500">
                  Nenhum comprovante enviado até agora.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </article>
    </>
  );
}
