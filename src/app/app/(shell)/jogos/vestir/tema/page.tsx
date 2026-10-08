import Link from "next/link";
import { redirect } from "next/navigation";
import { EnterCamarim } from "@/components/games/dress/DressActions";
import { ThemeCard } from "@/components/games/dress/ThemeCard";
import { VhStage } from "@/components/games/dress/Vh";
import { requireRole } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { todayBR } from "@/lib/games/engine";
import { gameOpenFor } from "@/lib/games/releaseServer";
import { runwayTheme } from "@/lib/games/dress/runway";
import { DRESS_SECONDS } from "@/lib/games/dress/rules";

const HUB = "/app/jogos/vestir";

/** Revelação do tema: lê a chamada, a dica e as sugestões; o relógio do camarim só começa em ENTENDI. */
export default async function TemaPage() {
  const { profile } = await requireRole("cria", "leader", "admin");
  if (!(await gameOpenFor("dress", profile.id))) redirect(HUB);
  const admin = createAdminClient();
  if (!admin) redirect(HUB);
  const date = todayBR();
  const { data: mine } = await admin.from("dress_runway_looks").select("id").eq("user_id", profile.id).eq("theme_date", date).maybeSingle();
  if (mine) redirect(`${HUB}/passarela`);
  const theme = runwayTheme(date);

  return (
    <VhStage>
      <p className="vh-ribbon mb-3">Novo tema</p>
      <ThemeCard theme={theme} full label="Tema de hoje" />

      <section className="vh-panel mb-4">
        <h2 className="vh-h2">Dica</h2>
        <p className="mt-1 text-sm text-purple-100">{theme.hint}</p>
        {theme.ref ? <p className="mt-1 text-xs font-bold text-amber-300">📖 {theme.ref}</p> : null}
        <details className="mt-3 text-sm text-purple-100">
          <summary className="cursor-pointer text-xs font-black uppercase tracking-wide text-amber-200">A história</summary>
          <p className="mt-1 leading-snug">{theme.historicalContext}</p>
        </details>
      </section>

      <section className="vh-panel mb-5">
        <h2 className="vh-h2">Sugestões</h2>
        <ul className="mt-2 flex flex-wrap gap-2">
          {theme.suggestions.map((s) => (
            <li key={s} className="rounded-full border-2 border-amber-300/70 bg-amber-100/10 px-3 py-1 text-xs font-bold text-amber-50">
              {s}
            </li>
          ))}
        </ul>
        <p className="mt-2 text-xs text-purple-200">São só ideias: você escolhe o que usar. Quando tocar em ENTENDI, o relógio de {Math.floor(DRESS_SECONDS / 60)} minutos começa.</p>
      </section>

      <EnterCamarim seconds={DRESS_SECONDS} />
      <Link href={HUB} className="vh-btn vh-btn-dark mt-3">
        ← Voltar
      </Link>
    </VhStage>
  );
}
