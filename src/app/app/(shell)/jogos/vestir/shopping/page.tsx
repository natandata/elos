import Link from "next/link";
import { DressCountdown } from "@/components/games/dress/DressTeaser";
import { LandscapeShell } from "@/components/games/dress/LandscapeShell";
import { MadureiraClient } from "@/components/games/dress/MadureiraClient";
import { SIcon } from "@/components/games/dress/ShopIcons";
import { VhStage } from "@/components/games/dress/Vh";
import { requireRole } from "@/lib/auth";
import { hasDate } from "@/lib/games/release";
import { gameOpenFor, getReleaseDates } from "@/lib/games/releaseServer";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Shopping Elos" };

const FEATURES: [string, string][] = [
  ["escada", "3 andares com escadas rolantes, para passear com as amigas no mesmo mundo online."],
  ["sacola", "Lojas enormes, do tamanho do salão de partidas, com peças épicas e lendárias para comprar com Bilhetes Dourados."],
  ["fogo", "Peças raras e limitadas: só 3 unidades por 24 horas. As atendentes avisam quando há uma na loja!"],
  ["talheres", "Praça de alimentação com cinco restaurantes: sente-se à mesa e coma com as amigas."],
  ["bilhete", "Cabine de bilhetes para doar até 30 Bilhetes Dourados por dia para outra jogadora."],
  ["cadeira", "Dá para pular, sentar nos bancos e conversar pelo chat enquanto passeia."],
];

export default async function ShoppingPage() {
  const { profile } = await requireRole("cria", "leader", "admin");
  const open = (await gameOpenFor("dress", profile.id)) && (await gameOpenFor("madureira", profile.id));
  if (!open) {
    const at = (await getReleaseDates()).madureira;
    return (
      <VhStage>
        <div className="vh-panel text-center">
          <div className="flex justify-center">
            <SIcon name="sacola" size="4.5rem" />
          </div>
          <p className="vh-title mt-1 text-3xl">Shopping Elos</p>
          <p className="mt-1 text-sm font-black uppercase tracking-wide text-amber-200">Em breve</p>
          <p className="mt-2 text-sm text-purple-100">Um shopping inteiro dentro do Vista o Herói, para passear, comprar e se divertir com as amigas.</p>
          {hasDate(at) ? (
            <div className="mt-4">
              <DressCountdown game="madureira" at={at} />
            </div>
          ) : null}
        </div>
        <section className="vh-panel mt-4">
          <h2 className="vh-h2 mb-2">O que vai ter</h2>
          <ul className="space-y-2">
            {FEATURES.map(([icon, text]) => (
              <li key={icon} className="flex items-start gap-3 rounded-xl bg-black/20 px-3 py-2 text-sm text-purple-50">
                <SIcon name={icon} size="2.2rem" />
                <span className="min-w-0 flex-1 pt-1">{text}</span>
              </li>
            ))}
          </ul>
        </section>
        <Link href="/app/jogos/vestir" className="vh-btn vh-btn-dark mt-4">
          ← Voltar ao Vista o Herói
        </Link>
      </VhStage>
    );
  }
  const supabase = await createClient();
  const [stats, inv] = await Promise.all([
    supabase.from("dress_stats").select("tickets").eq("user_id", profile.id).maybeSingle<{ tickets: number }>(),
    supabase.from("dress_inventory").select("family").eq("user_id", profile.id),
  ]);
  return (
    <LandscapeShell>
      <MadureiraClient meId={profile.id} meName={profile.full_name?.trim() || "Jogadora"} tickets={stats.data?.tickets ?? 0} owned={((inv.data ?? []) as { family: string }[]).map((r) => r.family)} />
    </LandscapeShell>
  );
}
