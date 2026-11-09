import { NextResponse, type NextRequest } from "next/server";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/** Link estável do comprovante (usado no PDF do relatório): confere o admin e redireciona para um link temporário do arquivo. */
export async function GET(_req: NextRequest, ctx: { params: Promise<{ userId: string }> }) {
  await requireRole("admin");
  const { userId } = await ctx.params;
  const supabase = await createClient();
  const { data } = await supabase.from("acampadentro_payment").select("file_path").eq("user_id", userId).maybeSingle();
  if (!data?.file_path) return new NextResponse("Comprovante não encontrado.", { status: 404 });
  const { data: signed } = await supabase.storage.from("payment_proofs").createSignedUrl(data.file_path, 300);
  if (!signed?.signedUrl) return new NextResponse("Não foi possível abrir o arquivo.", { status: 500 });
  return NextResponse.redirect(signed.signedUrl);
}
