"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { sweepOrphanFiles } from "@/lib/actions/storage-cleanup";

/** Varre e remove arquivos sem registro (sobra de posts já apagados). */
export function CleanupOrphansButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  async function run() {
    setBusy(true);
    setResult(null);
    try {
      const { removed, found, error } = await sweepOrphanFiles();
      if (error) setResult(`Falhou: ${error}`);
      else if (found === 0) setResult("Nenhum arquivo órfão encontrado.");
      else if (removed < found)
        setResult(`${removed} de ${found} removido(s) — o restante não pôde ser apagado.`);
      else setResult(`${removed} arquivo(s) removido(s).`);
      router.refresh();
    } catch {
      setResult("Não foi possível concluir a limpeza.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-3 border-t border-[var(--line)] pt-3">
      <p className="text-sm font-bold">Limpar arquivos órfãos</p>
      <p className="mb-2 text-xs text-[var(--muted)]">
        Remove imagens que ficaram no armazenamento sem post correspondente — sobra de fotos já
        excluídas ou empurradas pra fora do Explorar.
      </p>
      <button type="button" onClick={run} disabled={busy} className="btn btn-ghost !py-2 !text-sm">
        {busy ? "Limpando…" : "Limpar agora"}
      </button>
      {result ? <p className="mt-2 text-xs text-[var(--muted)]">{result}</p> : null}
    </div>
  );
}
