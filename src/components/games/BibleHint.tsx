/** Dica de leitura: onde procurar a resposta na Bíblia. */
export function BibleHint({ reference, className = "" }: { reference: string; className?: string }) {
  return (
    <p className={`rounded-2xl border-2 border-amber-300 bg-amber-50 px-4 py-2.5 text-sm font-bold text-amber-900 ${className}`}>
      📖 Dica: procure a resposta na Bíblia em <span className="font-black">{reference}</span>
    </p>
  );
}
