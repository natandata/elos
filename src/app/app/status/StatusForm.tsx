"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useFormStatus } from "react-dom";
import { submitStatus } from "@/lib/actions/status";
import { requestCareMeeting } from "@/lib/actions/care";
import { STATUS_LABEL, type Role, type StatusLevel } from "@/lib/types";
import { hideRouteLoading, showRouteLoading } from "@/components/RouteLoadingOverlay";
import { PushActivationPrompt } from "@/components/push/PushActivationPrompt";

const LEVELS: StatusLevel[] = ["bad", "ok", "good"];
const EMOJI: Record<StatusLevel, string> = { bad: "😔", ok: "😐", good: "😄" };

function Choice({
  name,
  value,
  onChange,
}: {
  name: string;
  value: StatusLevel | "";
  onChange: (v: StatusLevel) => void;
}) {
  return (
    <>
      <input type="hidden" name={name} value={value} />
      <div className="grid grid-cols-3 gap-2">
        {LEVELS.map((level) => (
          <button
            key={level}
            type="button"
            onClick={() => onChange(level)}
            className={`rounded-xl border px-2 py-3 text-xs font-semibold transition ${
              value === level
                ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent-strong)]"
                : "border-[var(--line)] text-[var(--muted)]"
            }`}
          >
            <span className="mb-1 block text-xl">{EMOJI[level]}</span>
            {STATUS_LABEL[level]}
          </button>
        ))}
      </div>
    </>
  );
}

function SubmitButton({ disabled, label }: { disabled: boolean; label: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn btn-primary w-full" disabled={pending || disabled}>
      {pending ? "Enviando…" : label}
    </button>
  );
}

export type CareAdmin = { id: string; full_name: string };

/** Depois de responder "Mal", oferece marcar uma conversa — com o líder (se
 *  for cria) ou com a administração (se for líder, o "líder de todos os
 *  líderes" hoje). */
function CareMeetingOffer({
  statusResponseId,
  role,
  admins,
  onDone,
}: {
  statusResponseId: string;
  role: "cria" | "leader";
  admins: CareAdmin[];
  onDone: () => void;
}) {
  const [careState, careAction] = useActionState(requestCareMeeting, null);
  const [modality, setModality] = useState<"online" | "presencial" | "">("");
  const [targetAdminId, setTargetAdminId] = useState("");
  const [skipped, setSkipped] = useState(false);
  const withWho = role === "leader" ? "a administração" : "seu líder";

  if (careState?.ok || skipped) {
    return (
      <div className="space-y-3 text-center">
        <p className="text-4xl">🙏</p>
        <p className="text-sm text-[var(--muted)]">
          {careState?.ok
            ? `Pedido enviado! ${role === "leader" ? "A administração" : "Seu líder"} vai confirmar o dia.`
            : `Tudo bem, ${withWho} já foi avisada que você respondeu "Mal".`}
        </p>
        <button type="button" className="btn btn-primary w-full" onClick={onDone}>
          Continuar
        </button>
      </div>
    );
  }

  return (
    <form action={careAction} className="space-y-4">
      <input type="hidden" name="status_response_id" value={statusResponseId} />
      <div className="text-center">
        <p className="text-3xl">💛</p>
        <p className="mt-2 text-sm font-semibold">Quer marcar uma conversa com {withWho}?</p>
        <p className="mt-1 text-xs text-[var(--muted)]">
          Só uma sugestão de dia — {role === "leader" ? "a administração confirma" : "seu líder confirma"}{" "}
          ou propõe outro.
        </p>
      </div>

      {role === "leader" && admins.length > 1 ? (
        <div>
          <label className="label" htmlFor="target_admin_id">
            Falar com
          </label>
          <select
            id="target_admin_id"
            name="target_admin_id"
            className="input"
            value={targetAdminId}
            onChange={(e) => setTargetAdminId(e.target.value)}
          >
            <option value="">Qualquer um da administração</option>
            {admins.map((a) => (
              <option key={a.id} value={a.id}>
                {a.full_name}
              </option>
            ))}
          </select>
        </div>
      ) : role === "leader" && admins.length === 1 ? (
        <input type="hidden" name="target_admin_id" value={admins[0].id} />
      ) : null}

      <div>
        <p className="label">Modalidade</p>
        <div className="grid grid-cols-2 gap-2">
          {(["online", "presencial"] as const).map((m) => (
            <button
              key={m}
              type="button"
              name="modality"
              onClick={() => setModality(m)}
              className={`rounded-xl border px-2 py-2.5 text-sm font-semibold transition ${
                modality === m
                  ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent-strong)]"
                  : "border-[var(--line)] text-[var(--muted)]"
              }`}
            >
              {m === "online" ? "Online" : "Presencial"}
            </button>
          ))}
        </div>
        <input type="hidden" name="modality" value={modality} />
      </div>

      <div>
        <label className="label" htmlFor="proposed_date">
          Dia sugerido
        </label>
        <input id="proposed_date" name="proposed_date" type="date" className="input" required />
      </div>

      <div>
        <label className="label" htmlFor="proposed_time">
          Horário (opcional)
        </label>
        <input id="proposed_time" name="proposed_time" type="time" className="input" />
      </div>

      <div>
        <label className="label" htmlFor="note">
          Quer contar algo? (opcional)
        </label>
        <textarea id="note" name="note" rows={2} className="input" />
      </div>

      {careState?.error ? (
        <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{careState.error}</p>
      ) : null}

      <SubmitButton disabled={!modality} label="Enviar pedido" />
      <button
        type="button"
        className="btn btn-ghost w-full !py-2 !text-sm"
        onClick={() => setSkipped(true)}
      >
        Agora não
      </button>
    </form>
  );
}

export function StatusForm({
  role,
  admins = [],
}: {
  role: Role;
  admins?: CareAdmin[];
}) {
  const [state, action] = useActionState(submitStatus, null);
  const [emotional, setEmotional] = useState<StatusLevel | "">("");
  const [spiritual, setSpiritual] = useState<StatusLevel | "">("");
  // Depois do "Mal", marca que a oferta de conversa já foi tratada — só
  // depois disso (se for o caso) é que o pedido de ativar push aparece.
  const [careHandled, setCareHandled] = useState(false);
  const router = useRouter();

  // Se a resposta voltou com erro, a tela de loading disparada no envio
  // abaixo precisa sair de novo — sem redirect real, o pathname nunca muda
  // pra escondê-la sozinha.
  useEffect(() => {
    if (state?.error) hideRouteLoading();
  }, [state]);

  function goToApp() {
    showRouteLoading();
    router.push("/app");
  }

  // Tudo derivado direto de `state` (o retorno da Server Action), no MESMO
  // ciclo de render em que ele muda — nada de useEffect+estado à parte pra
  // decidir o que mostrar. Um passo intermediário assim cria uma folga
  // entre "state chegou" e "tela atualizou" onde o Next.js pode vencer a
  // corrida com uma navegação implícita (revalidação da rota atual), e a
  // página de status tem sua própria guarda que redireciona assim que
  // enxerga a resposta de hoje já salva — a oferta de conversa/push nunca
  // chegava a aparecer.
  if (state?.ok && state.bad && state.statusResponseId && !careHandled) {
    return (
      <CareMeetingOffer
        statusResponseId={state.statusResponseId}
        role={role === "leader" ? "leader" : "cria"}
        admins={admins}
        onDone={() => {
          // Só fica na página se ainda falta oferecer o push — senão sai.
          if (state.showPushPrompt) setCareHandled(true);
          else goToApp();
        }}
      />
    );
  }

  if (state?.ok && state.showPushPrompt && (!state.bad || careHandled)) {
    return <PushActivationPrompt onDone={goToApp} />;
  }

  return (
    <form action={action} onSubmit={() => showRouteLoading()} className="space-y-5">
      <div>
        <p className="label">Como você está emocionalmente?</p>
        <Choice name="emotional" value={emotional} onChange={setEmotional} />
      </div>
      <div>
        <p className="label">Como você está espiritualmente?</p>
        <Choice name="spiritual" value={spiritual} onChange={setSpiritual} />
      </div>

      {state?.error ? (
        <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>
      ) : null}

      <SubmitButton disabled={!emotional || !spiritual} label="Enviar" />
    </form>
  );
}
