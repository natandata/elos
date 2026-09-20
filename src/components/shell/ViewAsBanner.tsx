import { stopViewAs } from "@/lib/actions/viewAs";

/** Faixa fixa avisando o ADMIN (só ele vê isso — nunca renderiza pro
 *  usuário-alvo, já que o cookie de view-as só tem efeito quando quem
 *  logou de fato é admin) que ele está enxergando o app como outra pessoa. */
export function ViewAsBanner({ targetName }: { targetName: string }) {
  return (
    <div className="sticky top-0 z-[60] flex flex-wrap items-center justify-between gap-2 bg-violet-700 px-4 py-2 text-sm text-white">
      <span>
        👁️ Visualizando como <strong>{targetName}</strong> — somente leitura, nada do que você
        fizer aqui é salvo.
      </span>
      <form action={stopViewAs}>
        <button type="submit" className="rounded-full bg-white/20 px-3 py-1 font-bold hover:bg-white/30">
          Sair da visualização
        </button>
      </form>
    </div>
  );
}
