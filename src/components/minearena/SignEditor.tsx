"use client";

import { useState } from "react";

/** Escreve o texto da placa. */
export function SignEditor({ initial, onSave, onClose }: { initial: string; onSave: (t: string) => void; onClose: () => void }) {
  const [text, setText] = useState(initial);
  return (
    <div className="ma-modal">
      <form
        className="ma-sign-form"
        onSubmit={(e) => {
          e.preventDefault();
          onSave(text);
        }}
      >
        <h3>✎ Texto da placa</h3>
        <input autoFocus value={text} maxLength={60} placeholder="Escreva algo…" onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.stopPropagation()} />
        <div className="ma-dialog-btns">
          <button type="submit" className="ma-btn ma-btn-gold">
            Salvar
          </button>
          <button type="button" className="ma-btn ma-btn-dark" onClick={onClose}>
            Cancelar
          </button>
        </div>
      </form>
    </div>
  );
}
