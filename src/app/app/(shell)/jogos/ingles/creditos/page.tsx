import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { BabelTop } from "@/components/english/BabelTop";
import { IcoBack } from "@/components/english/icons";
import { getEnglishState } from "@/lib/english/data.server";
import { TATOEBA_AUTHORS } from "@/lib/english/library.generated";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Créditos · Babel" };

export default async function CreditosPage() {
  const { profile } = await requireRole("cria", "leader", "admin");
  const state = await getEnglishState(await createClient(), profile.id);
  return (
    <div className="bb-pad">
      <BabelTop state={state} />
      <Link href="/app/jogos/ingles/perfil" className="mt-4 inline-flex items-center gap-1 text-sm font-extrabold text-[var(--bb-mute)]">
        <IcoBack className="h-4 w-4" /> Perfil
      </Link>
      <h1 className="mt-2 text-2xl font-extrabold">Créditos</h1>
      <p className="mt-3 text-sm leading-relaxed">
        Muitas das frases das unidades 5 a 10 vêm do projeto{" "}
        <a href="https://tatoeba.org" target="_blank" rel="noopener noreferrer" className="font-extrabold text-[var(--bb-blue)] underline">
          Tatoeba.org
        </a>
        , feito por voluntários do mundo todo, e estão sob a licença{" "}
        <a href="https://creativecommons.org/licenses/by/2.0/fr/" target="_blank" rel="noopener noreferrer" className="font-extrabold text-[var(--bb-blue)] underline">
          Creative Commons Atribuição 2.0 França (CC BY 2.0 FR)
        </a>
        . Algumas foram selecionadas e organizadas pelo Babel. Obrigado a quem escreveu e traduziu:
      </p>
      <p className="bb-card mt-4 p-4 text-sm leading-relaxed text-[var(--bb-mute)]">{TATOEBA_AUTHORS.join(", ")}.</p>
    </div>
  );
}
