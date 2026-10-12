import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "@/lib/config";

const PUBLIC_PATHS = ["/", "/auth/callback", "/admin-access"];

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const isPublic = PUBLIC_PATHS.includes(path);

  if (!user && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    url.searchParams.set("next", path);
    return NextResponse.redirect(url);
  }

  if (user && path === "/") {
    const url = request.nextUrl.clone();
    url.pathname = "/app";
    url.search = "";
    return NextResponse.redirect(url);
  }

  // Responsável (pai/mãe): acesso só-leitura, restrito a Explorar, Ranking
  // Geral de Crias e Agenda — reforçado aqui (não só escondendo do menu),
  // pra digitar a URL na mão não adiantar nada.
  if (user && path.startsWith("/app")) {
    const GUARDIAN_ALLOWED = ["/app", "/app/elogram", "/app/feed", "/app/ranking-crias", "/app/agenda", "/app/perfil", "/app/notificacoes"];
    const allowedForGuardian = GUARDIAN_ALLOWED.some((p) => path === p || path.startsWith(p + "/"));
    // caminho liberado pra todo mundo (ex.: Elogram): não precisa nem consultar o papel — uma ida ao banco a menos por toque
    const { data: profile } = allowedForGuardian
      ? { data: null }
      : await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
    if (profile?.role === "guardian" && !allowedForGuardian) {
      const url = request.nextUrl.clone();
      url.pathname = "/app/elogram";
      url.search = "";
      return NextResponse.redirect(url);
    }
  }

  return response;
}

export const config = {
  matcher: [
    // Fora do proxy: estáticos e os arquivos que o PWA precisa servir sem sessão.
    // Sem isso, /sw.js e /manifest.json seriam redirecionados para o login e a
    // instalação no celular falharia.
    // /api/cron/* fica fora: são rotinas agendadas, sem sessão de usuário —
    // elas se autenticam sozinhas pelo CRON_SECRET.
    "/((?!_next/static|_next/image|favicon.ico|manifest.json|sw.js|offline.html|api/cron|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|webmanifest)$).*)",
  ],
};
