"use client";

import { useActionState, useState } from "react";
import { Card, EmptyState } from "@/components/ui";
import { SubmitBtn, Feedback } from "@/components/forms";
import {
  createPrayerRequest,
  deletePrayerRequest,
  togglePrayerAnswered,
  togglePrayerReminder,
} from "@/lib/actions/devotional";
import { formatDate, type PrayerRequest } from "@/lib/types";

function NewPrayerForm() {
  const [state, action] = useActionState(createPrayerRequest, null);
  const [title, setTitle] = useState("");
  const [scope, setScope] = useState<"personal" | "elo">("personal");
  const [reminder, setReminder] = useState(false);

  return (
    <Card>
      <p className="label">Novo pedido de oração</p>
      <form
        action={(fd) => {
          action(fd);
          setTitle("");
        }}
        className="space-y-3"
      >
        <textarea
          name="title"
          rows={2}
          maxLength={500}
          className="input"
          placeholder="Pelo que você quer orar?"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex gap-2">
            {(["personal", "elo"] as const).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setScope(s)}
                className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                  scope === s
                    ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent-strong)]"
                    : "border-[var(--line)] text-[var(--muted)]"
                }`}
              >
                {s === "personal" ? "Só pra mim" : "Compartilhar com o Elo"}
              </button>
            ))}
          </div>
          <input type="hidden" name="scope" value={scope} />

          <label className="ml-auto flex items-center gap-1.5 text-xs text-[var(--muted)]">
            <input
              type="checkbox"
              checked={reminder}
              onChange={(e) => setReminder(e.target.checked)}
            />
            Lembrete diário
          </label>
          <input type="hidden" name="reminder_enabled" value={String(reminder)} />
        </div>

        <SubmitBtn disabled={!title.trim()}>Adicionar pedido</SubmitBtn>
        <Feedback state={state} />
      </form>
    </Card>
  );
}

function PrayerItem({ prayer, isOwner }: { prayer: PrayerRequest; isOwner: boolean }) {
  const [answeredState, answeredAction] = useActionState(togglePrayerAnswered, null);
  const [reminderState, reminderAction] = useActionState(togglePrayerReminder, null);
  const [deleteState, deleteAction] = useActionState(deletePrayerRequest, null);

  return (
    <li
      className={`rounded-xl border p-3 ${
        prayer.is_answered
          ? "border-emerald-200 bg-emerald-50"
          : "border-[var(--line)] bg-[var(--card)]"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <p className={`text-sm ${prayer.is_answered ? "text-emerald-800 line-through" : ""}`}>
          {prayer.title}
        </p>
        {prayer.scope === "elo" ? (
          <span className="chip shrink-0 border-[var(--line)] text-[10px] text-[var(--muted)]">Elo</span>
        ) : null}
      </div>
      <p className="mt-1 text-xs text-[var(--muted)]">
        {formatDate(prayer.created_at)}
        {prayer.is_answered ? " · respondido 🙌" : ""}
      </p>

      {isOwner ? (
        <div className="mt-2 flex flex-wrap gap-2">
          <form action={answeredAction}>
            <input type="hidden" name="id" value={prayer.id} />
            <input type="hidden" name="answered" value={String(!prayer.is_answered)} />
            <button type="submit" className="btn btn-ghost !px-2.5 !py-1 !text-xs">
              {prayer.is_answered ? "Marcar como pendente" : "Marcar como respondido"}
            </button>
          </form>
          <form action={reminderAction}>
            <input type="hidden" name="id" value={prayer.id} />
            <input type="hidden" name="enabled" value={String(!prayer.reminder_enabled)} />
            <button type="submit" className="btn btn-ghost !px-2.5 !py-1 !text-xs">
              {prayer.reminder_enabled ? "🔔 Lembrete ativo" : "🔕 Ativar lembrete"}
            </button>
          </form>
          <form action={deleteAction}>
            <input type="hidden" name="id" value={prayer.id} />
            <button type="submit" className="btn btn-ghost !px-2.5 !py-1 !text-xs text-red-700">
              Remover
            </button>
          </form>
          <Feedback state={answeredState ?? reminderState ?? deleteState} />
        </div>
      ) : null}
    </li>
  );
}

export function PrayerTab({
  prayers,
  currentUserId,
}: {
  prayers: PrayerRequest[];
  currentUserId: string;
}) {
  const pending = prayers.filter((p) => !p.is_answered);
  const answered = prayers.filter((p) => p.is_answered);

  return (
    <div className="space-y-4">
      <NewPrayerForm />

      {prayers.length === 0 ? (
        <EmptyState>Nenhum pedido de oração ainda.</EmptyState>
      ) : (
        <>
          {pending.length > 0 ? (
            <Card>
              <p className="mb-3 font-bold">Pedidos ({pending.length})</p>
              <ul className="space-y-2">
                {pending.map((p) => (
                  <PrayerItem key={p.id} prayer={p} isOwner={p.user_id === currentUserId} />
                ))}
              </ul>
            </Card>
          ) : null}

          {answered.length > 0 ? (
            <Card>
              <p className="mb-3 font-bold">Respondidos ({answered.length})</p>
              <ul className="space-y-2">
                {answered.map((p) => (
                  <PrayerItem key={p.id} prayer={p} isOwner={p.user_id === currentUserId} />
                ))}
              </ul>
            </Card>
          ) : null}
        </>
      )}
    </div>
  );
}
