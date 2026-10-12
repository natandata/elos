"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Avatar } from "@/components/Avatar";
import { toMarkup, type Mention } from "@/lib/mentions";

export type MentionCandidate = { id: string; name: string; username?: string | null; avatar?: string | null };

type AllSuggestion = { id: "__all__"; name: "todos"; all: true };
type Suggestion = (MentionCandidate & { all?: false }) | AllSuggestion;

/**
 * Campo de texto com marcação (@): ao digitar "@" e as primeiras letras, aparece a lista de pessoas.
 * Quem vê escreve "@Nome"; o que vai pro servidor (campo escondido `name`) é o texto com a marcação @[Nome](id).
 * - `candidates`: lista fixa de quem pode ser marcado (ex.: o Elo no chat). Sem ela, busca em todo o Elogram.
 * - `allowAll`: oferece @todos (chat do Elo).
 */
export function MentionInput({
  name,
  placeholder,
  maxLength,
  multiline = false,
  rows = 2,
  candidates,
  allowAll = false,
  excludeId,
  required = false,
  autoFocus = false,
  className = "",
  initialText = "",
  initialMentions = [],
  onTextChange,
}: {
  name: string;
  placeholder?: string;
  maxLength: number;
  multiline?: boolean;
  rows?: number;
  candidates?: MentionCandidate[];
  allowAll?: boolean;
  /** Quem escreve (não aparece na lista: ninguém marca a si mesmo). */
  excludeId?: string;
  required?: boolean;
  autoFocus?: boolean;
  className?: string;
  initialText?: string;
  initialMentions?: Mention[];
  onTextChange?: (display: string) => void;
}) {
  const [text, setText] = useState(initialText);
  const [mentions, setMentions] = useState<Mention[]>(initialMentions);
  const [query, setQuery] = useState<{ start: number; q: string } | null>(null);
  const [results, setResults] = useState<MentionCandidate[]>([]);
  const fieldRef = useRef<HTMLInputElement & HTMLTextAreaElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  // a pessoa terminou de enviar (o formulário foi limpo): limpa também o texto daqui
  useEffect(() => {
    const form = wrapRef.current?.closest("form");
    if (!form) return;
    const clear = () => {
      setText("");
      setMentions([]);
      setQuery(null);
    };
    form.addEventListener("reset", clear);
    return () => form.removeEventListener("reset", clear);
  }, []);

  // sugestões: lista fixa (filtrada na hora) ou busca no banco (a partir de 2 letras)
  const localResults = useMemo(() => {
    if (!candidates || !query) return [];
    const q = query.q.trim().toLowerCase();
    return candidates
      .filter((c) => !q || c.name.toLowerCase().includes(q) || (c.username ?? "").toLowerCase().includes(q))
      .slice(0, 6);
  }, [candidates, query]);

  useEffect(() => {
    if (!query || candidates) return;
    const q = query.q.trim().toLowerCase();
    if (q.length < 2) return;
    let cancelled = false;
    const timer = setTimeout(async () => {
      const supabase = createClient();
      const { data } = await supabase.rpc("search_profiles", { p_query: q });
      if (cancelled) return;
      setResults(
        ((data ?? []) as { id: string; full_name: string; username: string | null; avatar_url: string | null }[])
          .slice(0, 6)
          .map((r) => ({ id: r.id, name: r.full_name || "Sem nome", username: r.username, avatar: r.avatar_url })),
      );
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query, candidates]);

  function onChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    const value = e.target.value;
    setText(value);
    onTextChange?.(value);
    const caret = e.target.selectionStart ?? value.length;
    const m = /(^|\s)@([^\s@]{0,25})$/.exec(value.slice(0, caret));
    setQuery(m ? { start: caret - m[2].length - 1, q: m[2] } : null);
  }

  function pick(s: Suggestion) {
    if (!query) return;
    const el = fieldRef.current;
    const caret = el?.selectionStart ?? text.length;
    const label = s.all ? "todos" : s.name;
    const next = `${text.slice(0, query.start)}@${label} ${text.slice(caret)}`;
    setText(next);
    onTextChange?.(next);
    if (!s.all) {
      setMentions((cur) => (cur.some((c) => c.id === s.id) ? cur : [...cur, { id: s.id, name: s.name }]));
    }
    setQuery(null);
    setResults([]);
    const pos = query.start + label.length + 2;
    setTimeout(() => {
      el?.focus();
      el?.setSelectionRange(pos, pos);
    }, 0);
  }

  const showAll = allowAll && !!query && "todos".startsWith(query.q.trim().toLowerCase());
  const suggestions: Suggestion[] = [...(showAll ? [{ id: "__all__" as const, name: "todos" as const, all: true as const }] : []), ...(candidates ? localResults : query && query.q.trim().length >= 2 ? results : []).filter((r) => r.id !== excludeId)];

  const common = {
    ref: fieldRef,
    value: text,
    onChange,
    maxLength,
    placeholder,
    required,
    autoFocus,
    autoComplete: "off",
    className,
  };

  return (
    <div ref={wrapRef} className="relative min-w-0 flex-1">
      <input type="hidden" name={name} value={toMarkup(text, mentions)} />
      {multiline ? <textarea {...common} rows={rows} /> : <input {...common} />}

      {query && suggestions.length > 0 ? (
        <ul className="absolute inset-x-0 bottom-full z-30 mb-1 max-h-60 overflow-y-auto rounded-xl border border-[var(--line)] bg-[var(--card)] py-1 shadow-lg">
          {suggestions.map((s) => (
            <li key={s.id}>
              <button
                type="button"
                // mouseDown (não click): o campo não pode perder o foco antes da escolha
                onMouseDown={(e) => {
                  e.preventDefault();
                  pick(s);
                }}
                className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm hover:bg-[var(--bg)]"
              >
                {s.all ? (
                  <>
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--accent-soft)] text-base">📣</span>
                    <span className="min-w-0">
                      <span className="block font-semibold">@todos</span>
                      <span className="block text-xs text-[var(--muted)]">Avisa todo mundo do Elo</span>
                    </span>
                  </>
                ) : (
                  <>
                    <Avatar url={s.avatar} name={s.name} size={32} />
                    <span className="min-w-0">
                      <span className="block truncate font-semibold">{s.name}</span>
                      {s.username ? <span className="block truncate text-xs text-[var(--muted)]">@{s.username}</span> : null}
                    </span>
                  </>
                )}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
