"use client";

import { useActionState, useState } from "react";
import { deleteAnnouncement, saveAnnouncement } from "@/lib/actions/announcements";
import { Feedback, SubmitBtn } from "@/components/forms";

export type AnnouncementRow = {
  id: string;
  title: string;
  body: string;
  active: boolean;
  version: number;
  seenCount: number;
};

export function AnnouncementEditor({ item, totalUsers }: { item?: AnnouncementRow; totalUsers: number }) {
  const [state, action] = useActionState(saveAnnouncement, null);
  const [delState, delAction] = useActionState(deleteAnnouncement, null);
  const [open, setOpen] = useState(!item);

  return (
    <div className="card p-4">
      {item ? (
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="font-bold">{item.title}</p>
            <p className="mt-1 whitespace-pre-line text-sm text-[var(--muted)]">{item.body}</p>
            <p className="mt-2 text-xs text-[var(--muted)]">
              {item.active ? "🟢 No ar" : "⚪ Pausado"} · versão {item.version} · {item.seenCount} de{" "}
              {totalUsers} já viram
            </p>
          </div>
          <button type="button" className="btn btn-ghost !py-1 !text-xs" onClick={() => setOpen(!open)}>
            {open ? "Fechar" : "Editar"}
          </button>
        </div>
      ) : (
        <p className="font-bold">Novo aviso</p>
      )}

      {open ? (
        <form action={action} key={state?.ok ? "ok" : "form"} className="mt-3 space-y-3">
          {item ? <input type="hidden" name="id" value={item.id} /> : null}
          <div>
            <label className="label" htmlFor={`t-${item?.id ?? "new"}`}>
              Título
            </label>
            <input
              id={`t-${item?.id ?? "new"}`}
              name="title"
              className="input"
              maxLength={120}
              defaultValue={item?.title ?? ""}
              required
            />
          </div>
          <div>
            <label className="label" htmlFor={`b-${item?.id ?? "new"}`}>
              Texto do aviso
            </label>
            <textarea
              id={`b-${item?.id ?? "new"}`}
              name="body"
              className="input min-h-28"
              maxLength={1500}
              defaultValue={item?.body ?? ""}
              required
            />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="active" defaultChecked={item ? item.active : true} />
            No ar (aparece para quem ainda não viu)
          </label>
          {item ? (
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="republish" />
              Mostrar de novo para quem já viu
            </label>
          ) : null}
          <Feedback state={state} />
          <SubmitBtn className="btn btn-primary w-full !py-2" pendingLabel="Salvando…">
            {item ? "Salvar aviso" : "Publicar aviso"}
          </SubmitBtn>
        </form>
      ) : null}

      {item && open ? (
        <form
          action={delAction}
          className="mt-2"
          onSubmit={(e) => {
            if (!window.confirm("Excluir este aviso?")) e.preventDefault();
          }}
        >
          <input type="hidden" name="id" value={item.id} />
          <Feedback state={delState?.error ? delState : null} />
          <SubmitBtn className="btn btn-ghost w-full !py-2 !text-sm text-red-700" pendingLabel="Excluindo…">
            Excluir aviso
          </SubmitBtn>
        </form>
      ) : null}
    </div>
  );
}
