"use client";

import { useActionState, useState } from "react";
import { Card, EmptyState } from "@/components/ui";
import { SubmitBtn, Feedback } from "@/components/forms";
import { addFavoriteVerse, deleteFavoriteVerse } from "@/lib/actions/devotional";
import { formatDate, type DevotionalFavorite } from "@/lib/types";

function NewFavoriteForm() {
  const [state, action] = useActionState(addFavoriteVerse, null);
  const [reference, setReference] = useState("");
  const [verseText, setVerseText] = useState("");

  return (
    <Card>
      <p className="label">Salvar versículo favorito</p>
      <form
        action={(fd) => {
          action(fd);
          setReference("");
          setVerseText("");
        }}
        className="space-y-3"
      >
        <input
          name="reference"
          className="input"
          placeholder="Referência (ex.: João 3:16)"
          maxLength={100}
          value={reference}
          onChange={(e) => setReference(e.target.value)}
        />
        <textarea
          name="verse_text"
          rows={3}
          className="input"
          placeholder="Texto do versículo"
          maxLength={1000}
          value={verseText}
          onChange={(e) => setVerseText(e.target.value)}
        />
        <SubmitBtn disabled={!reference.trim() || !verseText.trim()}>Salvar</SubmitBtn>
        <Feedback state={state} />
      </form>
    </Card>
  );
}

function FavoriteCard({ favorite }: { favorite: DevotionalFavorite }) {
  const [state, action] = useActionState(deleteFavoriteVerse, null);
  const [showCard, setShowCard] = useState(false);

  return (
    <>
      <Card>
        <p className="text-sm font-bold text-[var(--accent-strong)]">{favorite.reference}</p>
        <p className="mt-1 whitespace-pre-wrap text-sm italic">"{favorite.verse_text}"</p>
        <div className="mt-3 flex items-center justify-between">
          <p className="text-xs text-[var(--muted)]">{formatDate(favorite.created_at)}</p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setShowCard(true)}
              className="btn btn-ghost !px-2.5 !py-1 !text-xs"
            >
              🖼️ Gerar card
            </button>
            <form action={action}>
              <input type="hidden" name="id" value={favorite.id} />
              <button type="submit" className="btn btn-ghost !px-2.5 !py-1 !text-xs text-red-700">
                Remover
              </button>
            </form>
          </div>
        </div>
        <Feedback state={state} />
      </Card>

      {showCard ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onClick={() => setShowCard(false)}
        >
          <div
            // sólido, não gradiente até --accent-strong: no tema masculino
            // accent-strong é escuro e quebraria o contraste com --accent-ink
            className="flex aspect-[4/5] w-full max-w-sm flex-col items-center justify-center gap-4 rounded-3xl bg-[var(--accent)] p-8 text-center text-[var(--accent-ink)] shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <span className="text-4xl" aria-hidden>
              ✝️
            </span>
            <p className="text-xl font-black leading-snug">"{favorite.verse_text}"</p>
            <p className="text-sm font-bold uppercase tracking-wide opacity-90">
              {favorite.reference}
            </p>
            <p className="mt-4 text-xs font-semibold opacity-70">ELOS · Meu Devocional</p>
          </div>
        </div>
      ) : null}
    </>
  );
}

export function FavoritesTab({ favorites }: { favorites: DevotionalFavorite[] }) {
  return (
    <div className="space-y-4">
      <NewFavoriteForm />
      {favorites.length === 0 ? (
        <EmptyState>Nenhum versículo favoritado ainda.</EmptyState>
      ) : (
        <div className="space-y-3">
          {favorites.map((f) => (
            <FavoriteCard key={f.id} favorite={f} />
          ))}
        </div>
      )}
    </div>
  );
}
