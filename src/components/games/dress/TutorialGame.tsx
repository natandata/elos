"use client";

import { useRouter } from "next/navigation";
import { useCallback, useMemo, useState } from "react";
import { Camarim, type CamarimEvent } from "./Camarim";
import { LandscapeShell } from "./LandscapeShell";
import { RunwayWalk } from "./RunwayWalk";
import { StarPicker } from "./Stars";
import { SparkleBurst, VhStage } from "./Vh";
import { DEFAULT_BEAUTY, baseFromBeauty, type Beauty } from "@/lib/games/dress/beauty";
import { MEGA_MULTIPLIER, MIN_PLAYERS, MAX_PLAYERS, PLACE_TICKETS, TICKETS_PER_XP } from "@/lib/games/dress/economy";
import { leaveImmersive } from "@/lib/games/dress/immersive";
import type { Look, Slot } from "@/lib/games/dress/items";
import type { PoseKey } from "@/lib/games/dress/live";
import { THEME_BY_ID, THEMES } from "@/lib/games/dress/themes";
import { createClient } from "@/lib/supabase/client";

type Step = { id: string; icon: string; title: string; text: string; done: (e: CamarimEvent, ctx: Ctx) => boolean };
type Ctx = { station: string | null };

const STEPS: Step[] = [
  { id: "move", icon: "🕹️", title: "Ande pelo salão", text: "Arraste o dedo no lado esquerdo da tela (joystick). No computador: WASD ou setas. Arraste do lado direito para girar a câmera.", done: (e) => e.type === "move" },
  { id: "goto", icon: "🧭", title: "Atalho para qualquer lugar", text: "Toque em “🧭 Ir para…” e escolha 👗 Roupas: a sua modelo caminha sozinha até as prateleiras.", done: (e) => e.type === "goto" },
  { id: "tunic", icon: "👗", title: "Vista uma roupa", text: "Chegue perto de uma roupa e toque no botão dourado, ou toque direto na peça da prateleira.", done: (e) => e.type === "equip" && e.slot === "tunic" },
  { id: "color", icon: "🎨", title: "Escolha a cor", text: "No painel roxo, toque numa bolinha de cor. Use ◀ ▶ para provar outras peças sem sair do lugar!", done: (e) => e.type === "color" },
  { id: "shoes", icon: "👠", title: "Agora os calçados", text: "Vá em 🧭 → 👠 Calçados e escolha um par. Os acessórios 🪄 e os mantos 🧣 funcionam do mesmo jeito.", done: (e) => e.type === "equip" && e.slot === "shoes" },
  { id: "makeup", icon: "💄", title: "Capriche na make", text: "Vá em 🧭 → 💄 Make e toque em “Maquiar”. Mude o batom, a sombra, o delineado… tem muita coisa!", done: (e, c) => e.type === "tweak" && c.station === "makeup" && e.keys.some((k) => ["lip", "lipStyle", "shadow", "liner", "linerColor", "lashes", "blush", "eye", "brows", "browColor", "marks"].includes(k)) },
  { id: "hair", icon: "💇‍♀️", title: "Cabelo", text: "Vá em 🧭 → 💇 Cabelo e toque em “Cabelo”. Escolha o penteado e a cor.", done: (e, c) => e.type === "tweak" && c.station === "hair" && e.keys.some((k) => k === "hair" || k === "hairColor") },
  { id: "pose", icon: "💃", title: "Escolha a pose", text: "Toque no botão da pose (embaixo) e escolha como a sua modelo para no fim da passarela.", done: (e) => e.type === "pose" },
  { id: "ready", icon: "✅", title: "Tudo pronto!", text: "Toque em “ESTOU PRONTA”. Na partida de verdade, quando o relógio zera o seu look é registrado e o desfile começa.", done: () => false },
];

/** Tutorial: ensina as mecânicas (andar, vestir, cor, make, cabelo, pose, desfile, estrelas e prêmios) sem adversárias. */
export function TutorialGame() {
  const router = useRouter();
  const sb = useMemo(() => createClient(), []);
  const theme = THEME_BY_ID.get("mulher_virtuosa") ?? THEMES[0];
  const [step, setStep] = useState(0);
  const [ctx, setCtx] = useState<Ctx>({ station: null });
  const [stage, setStage] = useState<"play" | "runway" | "vote" | "prize">("play");
  const [result, setResult] = useState<{ look: Look; beauty: Beauty; pose: PoseKey } | null>(null);
  const [stars, setStars] = useState(0);
  const [reward, setReward] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onEvent = useCallback(
    (e: CamarimEvent) => {
      let c = ctx;
      if (e.type === "station") {
        c = { station: e.cat ?? null };
        setCtx(c);
      }
      setStep((i) => (STEPS[i]?.done(e, c) ? Math.min(i + 1, STEPS.length - 1) : i));
    },
    [ctx],
  );

  const finish = useCallback((look: Look, beauty: Beauty, pose: PoseKey) => {
    setResult({ look, beauty, pose });
    setStage("runway");
  }, []);

  async function conclude() {
    if (busy) return;
    setBusy(true);
    setError(null);
    const { data, error: e } = await sb.rpc("dress_tutorial_done");
    setBusy(false);
    const r = (data ?? {}) as { error?: string; reward?: number };
    if (e || r.error) return setError(r.error ?? "Não foi possível registrar. Tente de novo.");
    setReward(r.reward ?? 0);
  }
  function leave() {
    leaveImmersive();
    router.push("/app/jogos/vestir");
  }

  const cur = STEPS[step];
  const coach =
    stage === "play" ? (
      <div className="vh-coach vh-panel vh-pop" role="status" aria-live="polite">
        <div className="flex items-start gap-2">
          <span className="text-xl" aria-hidden>
            {cur.icon}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-amber-200">
              Passo {step + 1} de {STEPS.length}
            </p>
            <p className="text-sm font-black leading-tight text-amber-50">{cur.title}</p>
            <p className="mt-0.5 text-[11px] font-semibold leading-snug text-purple-100">{cur.text}</p>
          </div>
        </div>
        <div className="mt-1.5 flex items-center gap-1" aria-hidden>
          {STEPS.map((s, i) => (
            <span key={s.id} className="h-1.5 flex-1 rounded-full" style={{ background: i < step ? "#fbbf24" : i === step ? "#fff" : "rgba(255,255,255,0.25)" }} />
          ))}
        </div>
        {step < STEPS.length - 1 ? (
          <button type="button" className="mt-1 text-[10px] font-bold text-purple-200 underline" onClick={() => setStep((i) => Math.min(i + 1, STEPS.length - 1))}>
            Pular este passo
          </button>
        ) : null}
      </div>
    ) : null;

  return (
    <LandscapeShell>
      {stage === "play" ? (
        <Camarim theme={theme} mode="tutorial" draftKey="vh:tutorial" exitHref="/app/jogos/vestir" onEvent={onEvent} onReady={finish} coach={coach} />
      ) : null}

      {stage === "runway" && result ? (
        <VhStage>
          <p className="vh-title mb-1 text-center text-3xl">Seu desfile!</p>
          <p className="mb-3 text-center text-sm text-purple-100">É assim que as amigas vão ver você. Cada modelo desfila por 30 segundos e, enquanto isso, as outras dão estrelas.</p>
          <div className="vh-cols vh-cols-wide">
            <RunwayWalk base={baseFromBeauty(result.beauty)} look={result.look} name="você" scene={theme.scene} pose={result.pose} showMs={14000} />
            <div className="vh-panel text-center">
              <p className="vh-h2">O que acontece</p>
              <ul className="mt-2 space-y-1.5 text-left text-sm text-purple-100">
                <li>🚶 Ela entra andando e faz a pose que você escolheu.</li>
                <li>🌀 Dá uma voltinha e cruza a passarela.</li>
                <li>📸 Termina na frente, com flashes.</li>
              </ul>
              <button type="button" className="vh-btn mt-4" onClick={() => setStage("vote")}>
                Continuar →
              </button>
            </div>
          </div>
        </VhStage>
      ) : null}

      {stage === "vote" && result ? (
        <VhStage>
          <p className="vh-title mb-1 text-center text-3xl">Agora é a sua vez de votar</p>
          <p className="mb-3 text-center text-sm text-purple-100">Quando a modelo de uma amiga desfila, toque nas estrelas, lá embaixo da passarela. De 1 a 5. Não dá para trocar a nota nem votar em você.</p>
          <div className="vh-cols vh-cols-wide">
            <RunwayWalk base={baseFromBeauty({ ...DEFAULT_BEAUTY, hair: "ponytail", hairColor: "#d9b25a", skin: "#d9a66f" })} look={{ tunic: "tunic_blue", head: "head_headscarf", shoes: "shoes_sandals" }} name="Exemplo" scene={theme.scene} pose="elegante" showMs={30000}>
              <div className="vh-starbar" data-done={stars > 0}>
                <StarPicker value={stars} onPick={setStars} disabled={stars > 0} />
              </div>
            </RunwayWalk>
            <div className="vh-panel text-center">
              {stars > 0 ? (
                <>
                  <SparkleBurst n={10} />
                  <p className="vh-h2">Nota registrada! ✨</p>
                  <p className="mt-1 text-sm text-purple-100">Pronto, é só isso. Quanto mais estrelas uma modelo recebe, mais alto ela sobe no pódio.</p>
                  <button type="button" className="vh-btn mt-4" onClick={() => setStage("prize")}>
                    Continuar →
                  </button>
                </>
              ) : (
                <>
                  <p className="vh-h2">Toque nas estrelas ⭐</p>
                  <p className="mt-1 text-sm text-purple-100">Esta é uma modelo de exemplo. Dê a nota que você achar justa!</p>
                </>
              )}
            </div>
          </div>
        </VhStage>
      ) : null}

      {stage === "prize" ? (
        <VhStage>
          <p className="vh-title mb-1 text-center text-3xl">Prêmios</p>
          <div className="vh-cols">
            <section className="vh-panel mb-3">
              <h2 className="vh-h2 mb-2">Bilhetes Dourados 🎫</h2>
              <p className="text-sm text-purple-100">
                Cada partida tem de {MIN_PLAYERS} a {MAX_PLAYERS} jogadoras e só o pódio ganha:
              </p>
              <p className="my-2 text-center text-lg font-black text-amber-100">
                🥇 {PLACE_TICKETS[0]} · 🥈 {PLACE_TICKETS[1]} · 🥉 {PLACE_TICKETS[2]}
              </p>
              <p className="text-sm text-purple-100">
                A <b className="text-amber-200">1ª vitória de cada dia vale 1 XP</b>. E {TICKETS_PER_XP} 🎫 também viram 1 XP na troca!
              </p>
            </section>
            <section className="vh-panel mb-3">
              <h2 className="vh-h2 mb-2">Missões e Mega Desfile 🎆</h2>
              <p className="text-sm text-purple-100">Missões do dia e da semana pagam bilhetes (jogar 10 partidas = 30 🎫, por exemplo). Toda sexta às 19h tem o Mega Desfile, com muito mais jogadoras e prêmios em dobro: 🥇 {PLACE_TICKETS[0] * MEGA_MULTIPLIER} 🥈 {PLACE_TICKETS[1] * MEGA_MULTIPLIER} 🥉 {PLACE_TICKETS[2] * MEGA_MULTIPLIER}.</p>
            </section>
          </div>
          {reward === null ? (
            <button type="button" className="vh-btn mx-auto max-w-sm" disabled={busy} onClick={() => void conclude()}>
              🎓 Concluir e ganhar 10 🎫
            </button>
          ) : (
            <div className="vh-panel vh-pop mx-auto max-w-sm text-center">
              <SparkleBurst n={14} />
              <p className="vh-title text-3xl">{reward > 0 ? `+${reward} 🎫` : "Tutorial concluído!"}</p>
              <p className="mt-1 text-sm text-purple-100">{reward > 0 ? "Bilhetes Dourados de presente por aprender a jogar." : "Você já tinha ganhado o presente do tutorial."}</p>
              <button type="button" className="vh-btn mt-3" onClick={leave}>
                Ir jogar com as amigas
              </button>
            </div>
          )}
          {error ? (
            <p className="mx-auto mt-2 max-w-sm rounded-xl bg-rose-900/80 px-3 py-2 text-sm font-bold text-rose-100" role="alert">
              {error}
            </p>
          ) : null}
          <button type="button" className="vh-btn vh-btn-dark mx-auto mt-3 max-w-sm" onClick={leave}>
            ← Voltar
          </button>
        </VhStage>
      ) : null}
    </LandscapeShell>
  );
}

export type { Slot };
