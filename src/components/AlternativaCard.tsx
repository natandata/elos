/** Aviso de 18 anos: a tela de início do cria mostra só este card até a conta ser encerrada. */
export function AlternativaCard({ deleteOn }: { deleteOn: string | null }) {
  const [y, m, d] = (deleteOn ?? "").split("-");
  return (
    <div className="mx-auto mt-6 max-w-xl rounded-3xl border-2 border-[var(--accent)] bg-[var(--accent-soft)] px-6 py-10 text-center text-[var(--accent-strong)]">
      <p className="text-4xl" aria-hidden>
        🎓
      </p>
      <p className="mt-3 text-3xl font-black leading-tight sm:text-4xl">Parabéns pelos seus 18 anos, você agora é um Alternativa!</p>
      <p className="mt-5 text-sm font-semibold opacity-90">Aproveita os últimos 30 dias no Elos. Sua conta será excluída ao final desse período.</p>
      {y && m && d ? <p className="mt-2 text-xs font-medium opacity-70">Exclusão em {d}/{m}/{y}</p> : null}
    </div>
  );
}
