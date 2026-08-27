import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sendWelcomeEmailIfNeeded } from "@/lib/actions/welcome";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const nextParam = searchParams.get("next");
  const next = nextParam && nextParam.startsWith("/") ? nextParam : "/app";

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      // Idempotente (welcome_email_sent_at). Aguarda pra não ser morto pelo
      // fim da função serverless antes de terminar — mas nunca bloqueia o
      // redirect por causa de uma falha no envio.
      if (data.user) await sendWelcomeEmailIfNeeded(data.user.id).catch(() => {});
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/?erro=auth`);
}
