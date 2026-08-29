"use client";

import { useState } from "react";
import { useActionState } from "react";
import { updateOwnBio } from "@/lib/actions/profile";
import { Feedback, SubmitBtn } from "@/components/forms";

const MAX = 150;

export function BioForm({ bio }: { bio: string | null }) {
  const [state, action] = useActionState(updateOwnBio, null);
  const [text, setText] = useState(bio ?? "");

  return (
    <form action={action} className="space-y-2">
      <label className="label" htmlFor="bio">
        Bio
      </label>
      <textarea
        id="bio"
        name="bio"
        rows={3}
        maxLength={MAX}
        className="input resize-none"
        placeholder="Conte um pouco sobre você…"
        value={text}
        onChange={(e) => setText(e.target.value)}
      />
      <p className="text-right text-xs text-[var(--muted)] tabular-nums">
        {text.length}/{MAX}
      </p>
      <Feedback state={state} />
      <SubmitBtn className="btn btn-primary !py-2 !text-sm">Salvar</SubmitBtn>
    </form>
  );
}
