"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { LandscapeShell } from "./LandscapeShell";
import { MegaCard } from "./MegaCard";
import { VhStage } from "./Vh";
import { notifyRoomOpened } from "@/lib/actions/dressLive";
import { MAX_PLAYERS, MIN_PLAYERS } from "@/lib/games/dress/economy";
import { enterImmersive, leaveImmersive } from "@/lib/games/dress/immersive";
import { PHASE_LABEL, cleanCode, type RoomAd } from "@/lib/games/dress/live";
import { createClient } from "@/lib/supabase/client";

/** Entrada das salas ao vivo: criar uma sala, entrar por código ou escolher uma sala aberta. */
export function LiveLobby() {
  const router = useRouter();
  const sb = useMemo(() => createClient(), []);
  const [rooms, setRooms] = useState<RoomAd[] | null>(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data, error: e } = await sb.rpc("dress_rooms_open");
    if (!e) setRooms((data ?? []) as RoomAd[]);
  }, [sb]);

  useEffect(() => {
    const first = setTimeout(() => void load(), 0);
    const id = setInterval(() => void load(), 5000);
    return () => {
      clearTimeout(first);
      clearInterval(id);
    };
  }, [load]);

  async function create(isPublic: boolean) {
    if (busy) return;
    enterImmersive();
    setBusy(true);
    setError(null);
    const { data, error: e } = await sb.rpc("dress_room_create", { p_public: isPublic });
    if (e || !data) {
      setBusy(false);
      return setError("Não foi possível criar a sala. Tente de novo.");
    }
    if (isPublic) void notifyRoomOpened(data as string);
    router.push(`/app/jogos/vestir/sala/${data as string}`);
  }

  async function join(c: string) {
    const clean = cleanCode(c);
    if (clean.length !== 4) return setError("O código tem 4 letras ou números.");
    if (busy) return;
    enterImmersive();
    setBusy(true);
    setError(null);
    const { data, error: e } = await sb.rpc("dress_room_join", { p_code: clean });
    const r = (data ?? {}) as { error?: string };
    if (e || r.error) {
      setBusy(false);
      return setError(r.error ?? "Não foi possível entrar. Confira a conexão.");
    }
    router.push(`/app/jogos/vestir/sala/${clean}`);
  }

  async function watch(c: string) {
    const clean = cleanCode(c);
    if (clean.length !== 4) return setError("O código tem 4 letras ou números.");
    if (busy) return;
    enterImmersive();
    setBusy(true);
    setError(null);
    const { data, error: e } = await sb.rpc("dress_room_watch", { p_code: clean });
    const r = (data ?? {}) as { error?: string };
    if (e || r.error) {
      setBusy(false);
      return setError(r.error ?? "Não foi possível entrar na plateia. Confira a conexão.");
    }
    router.push(`/app/jogos/vestir/sala/${clean}?assistir=1`);
  }

  return (
    <LandscapeShell>
    <VhStage>
      <p className="vh-title mb-1 text-center text-3xl">Passarela ao vivo</p>
      <p className="mb-4 text-center text-sm text-purple-100">Todas recebem o mesmo tema, se vestem ao mesmo tempo, desfilam e dão estrelas umas às outras.</p>

      <MegaCard />

      <section className="vh-panel mb-4">
        <h2 className="vh-h2 mb-2">Criar uma sala</h2>
        <div className="grid grid-cols-2 gap-2">
          <button type="button" className="vh-btn" disabled={busy} onClick={() => void create(true)}>
            🌍 Sala aberta
          </button>
          <button type="button" className="vh-btn vh-btn-purple" disabled={busy} onClick={() => void create(false)}>
            🔒 Só com código
          </button>
        </div>
        <p className="mt-2 text-[11px] text-purple-200">A rodada começa sozinha quando houver pelo menos {MIN_PLAYERS} jogadoras (até {MAX_PLAYERS}). Chame as amigas com o código!</p>
      </section>

      <section className="vh-panel mb-4">
        <h2 className="vh-h2 mb-2">Entrar com código</h2>
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            void join(code);
          }}
        >
          <input
            value={code}
            onChange={(e) => setCode(cleanCode(e.target.value))}
            placeholder="AB12"
            maxLength={4}
            autoCapitalize="characters"
            autoComplete="off"
            aria-label="Código da sala"
            className="min-w-0 flex-1 rounded-2xl border-2 border-amber-300 bg-white/95 px-3 py-2 text-center text-2xl font-black uppercase tracking-[0.3em] text-purple-950 outline-none"
          />
          <button type="submit" className="vh-btn !w-auto !px-5" disabled={busy || code.length !== 4}>
            Entrar
          </button>
          <button type="button" className="vh-btn vh-btn-dark !w-auto !px-4" disabled={busy || code.length !== 4} onClick={() => void watch(code)}>
            👀 Assistir
          </button>
        </form>
        {error ? (
          <p className="mt-2 rounded-xl bg-rose-900/80 px-3 py-2 text-sm font-bold text-rose-100" role="alert">
            {error}
          </p>
        ) : null}
      </section>

      <section className="vh-panel mb-4">
        <h2 className="vh-h2 mb-2">Salas abertas</h2>
        {rooms === null ? (
          <p className="text-sm text-purple-200">Procurando salas…</p>
        ) : rooms.length === 0 ? (
          <p className="text-sm text-purple-200">Nenhuma sala aberta agora. Crie a sua e chame as amigas!</p>
        ) : (
          <ul className="space-y-1.5">
            {rooms.map((r) => (
              <li key={r.code} className="vh-row">
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-bold text-amber-50">
                    Sala de {r.host ?? "alguém"} · {r.code}
                  </span>
                  <span className="block text-[11px] text-purple-200">
                    {r.players}/{r.max} jogadoras · {PHASE_LABEL[r.phase] ?? "em jogo"}
                  </span>
                </span>
                <button type="button" className="vh-chip !px-3 !py-1 !text-xs" disabled={busy} onClick={() => void join(r.code)}>
                  Entrar
                </button>
                <button type="button" className="vh-chip !px-3 !py-1 !text-xs" disabled={busy} onClick={() => void watch(r.code)} aria-label={`Assistir à sala ${r.code}`}>
                  👀
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <button
        type="button"
        className="vh-btn vh-btn-dark"
        onClick={() => {
          leaveImmersive();
          router.push("/app/jogos/vestir");
        }}
      >
        ← Voltar
      </button>
    </VhStage>
    </LandscapeShell>
  );
}
