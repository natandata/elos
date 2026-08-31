"use client";

import { useActionState, useState } from "react";
import { Card, EmptyState } from "@/components/ui";
import { SubmitBtn, Feedback } from "@/components/forms";
import { saveDiaryEntry } from "@/lib/actions/devotional";
import { formatDate, type DevotionalEntry } from "@/lib/types";

/** Diário do dia + histórico das últimas anotações. Uma anotação por dia —
 *  salvar de novo no mesmo dia atualiza (upsert), não duplica. */
export function DiaryTab({
  today,
  todayEntry,
  entries,
}: {
  today: string;
  todayEntry: DevotionalEntry | null;
  entries: DevotionalEntry[];
}) {
  const [state, action] = useActionState(saveDiaryEntry, null);
  const [content, setContent] = useState(todayEntry?.content ?? "");
  const past = entries.filter((e) => e.entry_date !== today);

  return (
    <div className="space-y-4">
      <Card>
        <p className="label">O que você aprendeu hoje?</p>
        <p className="mb-2 text-xs text-[var(--muted)]">
          Reflexões, insights ou como pretende aplicar a leitura na sua rotina.
        </p>
        <form action={action} className="space-y-3">
          <input type="hidden" name="entry_date" value={today} />
          <textarea
            name="content"
            rows={6}
            maxLength={4000}
            className="input"
            placeholder="Escreva sua reflexão do dia…"
            value={content}
            onChange={(e) => setContent(e.target.value)}
          />
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs text-[var(--muted)]">{content.length}/4000</span>
            <SubmitBtn disabled={!content.trim()}>Salvar</SubmitBtn>
          </div>
          <Feedback state={state} />
        </form>
      </Card>

      {past.length > 0 ? (
        <Card>
          <p className="mb-3 font-bold">Histórico</p>
          <ul className="space-y-3">
            {past.map((e) => (
              <li key={e.id} className="border-t border-[var(--line)] pt-3 first:border-0 first:pt-0">
                <p className="text-xs font-semibold text-[var(--muted)]">{formatDate(e.entry_date)}</p>
                <p className="mt-1 whitespace-pre-wrap text-sm">{e.content}</p>
              </li>
            ))}
          </ul>
        </Card>
      ) : (
        <EmptyState>Suas próximas anotações vão aparecer aqui.</EmptyState>
      )}
    </div>
  );
}
