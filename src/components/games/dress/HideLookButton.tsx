"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { hideRunwayLook } from "@/lib/actions/runway";

export function HideLookButton({ id, hidden }: { id: string; hidden: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  return (
    <button
      type="button"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        await hideRunwayLook(id, !hidden).catch(() => null);
        setBusy(false);
        router.refresh();
      }}
      className="btn btn-ghost !px-3 !py-1.5 !text-xs"
    >
      {busy ? "..." : hidden ? "Mostrar" : "Esconder"}
    </button>
  );
}
