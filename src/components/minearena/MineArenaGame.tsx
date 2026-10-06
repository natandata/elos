"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { type DialogInfo, type HudState, MineArena } from "@/lib/minearena/game";
import { type WorldSave, deleteWorld, listWorlds, putWorld } from "@/lib/minearena/save/save";
import { seedFromString } from "@/lib/minearena/world/noise";
import { findSpawn } from "@/lib/minearena/world/worldgen";
import { Hud, type Msg } from "./Hud";
import { InventoryPanel } from "./InventoryPanel";
import { MainMenu } from "./MainMenu";
import { DeathScreen, HeroDialog, LoadingScreen, PauseMenu } from "./Overlays";
import { TouchControls } from "./TouchControls";

const DISTANCES = [
  { label: "Curta", r: 3 },
  { label: "Média", r: 4 },
  { label: "Longa", r: 6 },
  { label: "Máxima", r: 8 },
];

const portraitNow = () => window.matchMedia("(orientation: portrait)").matches;
const subscribePortrait = (fn: () => void) => {
  const m = window.matchMedia("(orientation: portrait)");
  m.addEventListener("change", fn);
  return () => m.removeEventListener("change", fn);
};

/** No celular: tela cheia e, onde o aparelho deixa, trava deitado (como o Minecraft). */
function enterImmersive(): void {
  if (!window.matchMedia("(pointer: coarse)").matches) return;
  const el = document.documentElement;
  void (el.requestFullscreen?.() ?? Promise.resolve())
    .then(() => (screen.orientation as ScreenOrientation & { lock?: (o: string) => Promise<void> }).lock?.("landscape"))
    .catch(() => undefined);
}
function leaveImmersive(): void {
  try {
    (screen.orientation as ScreenOrientation & { unlock?: () => void }).unlock?.();
    if (document.fullscreenElement) void document.exitFullscreen();
  } catch {
    // sem tela cheia, nada a desfazer
  }
}

const coarse = () => window.matchMedia("(pointer: coarse)").matches;
const subscribeCoarse = (fn: () => void) => {
  const m = window.matchMedia("(pointer: coarse)");
  m.addEventListener("change", fn);
  return () => m.removeEventListener("change", fn);
};

function Play({ save, rotated, onExit }: { save: WorldSave; rotated: boolean; onExit: () => void }) {
  const mobile = useSyncExternalStore(subscribeCoarse, coarse, () => false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [game, setGame] = useState<MineArena | null>(null);
  const [hud, setHud] = useState<HudState | null>(null);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [dialog, setDialog] = useState<DialogInfo | null>(null);
  const [bag, setBag] = useState<null | "bag" | "craft">(null);
  const [paused, setPaused] = useState(false);
  const [muted, setMuted] = useState(false);
  const [dist, setDist] = useState(mobile ? 1 : 2);
  const msgId = useRef(0);
  const gameRef = useRef<MineArena | null>(null);

  const pushMsg = useCallback((text: string, tone: Msg["tone"]) => {
    const id = ++msgId.current;
    setMsgs((m) => [...m.slice(-3), { id, text, tone }]);
    window.setTimeout(() => setMsgs((m) => m.filter((x) => x.id !== id)), tone === "rare" ? 5500 : 3500);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let g: MineArena | null = null;
    try {
      g = new MineArena(
        canvas,
        save,
        {
          onHud: setHud,
          onMessage: pushMsg,
          onDialog: setDialog,
          onOpenCrafting: () => {
            g?.setUiOpen(true);
            setBag("craft");
          },
          onPauseRequest: () => {
            g?.setPaused(true);
            setPaused(true);
          },
        },
        { mobile, renderDistance: DISTANCES[mobile ? 1 : 2].r },
      );
    } catch {
      pushMsg("Seu aparelho não conseguiu iniciar o gráfico 3D.", "warn");
      return;
    }
    gameRef.current = g;
    g.start();
    const created = g;
    void Promise.resolve().then(() => setGame(created));
    return () => {
      void g?.dispose();
      gameRef.current = null;
    };
    // o mundo carregado não muda enquanto a tela de jogo está aberta
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [save.id]);

  const openBag = useCallback((tab: "bag" | "craft") => {
    gameRef.current?.setUiOpen(true);
    setBag(tab);
  }, []);
  const closeBag = useCallback(() => {
    gameRef.current?.setUiOpen(false);
    setBag(null);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === "KeyE" && !paused && !dialog) {
        if (bag) closeBag();
        else openBag("bag");
      }
      if (e.code === "Escape" && bag) closeBag();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [bag, paused, dialog, openBag, closeBag]);

  const resume = () => {
    gameRef.current?.setPaused(false);
    setPaused(false);
  };

  return (
    <div className={rotated ? "ma-root ma-rot" : "ma-root"}>
      <canvas ref={canvasRef} className="ma-canvas" />
      {game && hud && !hud.loading ? <Hud hud={hud} msgs={msgs} onSelect={(i) => game.inventory.select(i)} /> : null}
      {game && hud && !hud.loading && mobile && !bag && !dialog && !paused && hud.alive ? (
        <TouchControls game={game} rotated={rotated} onInventory={() => openBag("bag")} onPause={() => {
          game.setPaused(true);
          setPaused(true);
        }} />
      ) : null}
      {game && bag ? <InventoryPanel game={game} startTab={bag} rotated={rotated} onClose={closeBag} /> : null}
      {dialog && game ? <HeroDialog d={dialog} onAct={(a) => game.dialogAct(a)} /> : null}
      {paused && game ? (
        <PauseMenu
          muted={muted}
          distance={DISTANCES[dist].label}
          onResume={resume}
          onMute={() => {
            game.setMuted(!muted);
            setMuted(!muted);
          }}
          onDistance={() => {
            const n = (dist + 1) % DISTANCES.length;
            setDist(n);
            game.setRenderDistance(DISTANCES[n].r);
          }}
          onExit={() => {
            void (gameRef.current?.saveNow() ?? Promise.resolve()).then(onExit);
          }}
        />
      ) : null}
      {hud && !hud.alive && game ? <DeathScreen onRespawn={() => game.respawn()} /> : null}
      {!hud || hud.loading ? <LoadingScreen /> : null}
    </div>
  );
}

export function MineArenaGame() {
  const mobile = useSyncExternalStore(subscribeCoarse, coarse, () => false);
  const portrait = useSyncExternalStore(subscribePortrait, portraitNow, () => false);
  // celular em pé (e sem trava de rotação): gira o jogo 90° pra ocupar a tela deitada
  const rotated = mobile && portrait;
  const [worlds, setWorlds] = useState<WorldSave[] | null>(null);
  const [active, setActive] = useState<WorldSave | null>(null);

  const refresh = useCallback(async () => setWorlds(await listWorlds()), []);
  useEffect(() => {
    let on = true;
    void listWorlds().then((w) => {
      if (on) setWorlds(w);
    });
    return () => {
      on = false;
    };
  }, []);

  const create = async (name: string, seedText: string) => {
    enterImmersive();
    const seed = seedText ? seedFromString(seedText) : Math.floor(Math.random() * 2 ** 31);
    const spawn = findSpawn(seed);
    const now = Date.now();
    const w: WorldSave = {
      id: `${now.toString(36)}${Math.random().toString(36).slice(2, 6)}`,
      name,
      seed,
      createdAt: now,
      updatedAt: now,
      playedSeconds: 0,
      time: 0.06,
      player: { x: spawn.x, y: spawn.y, z: spawn.z, yaw: 0, pitch: 0, health: 20, hunger: 20 },
      spawn,
      inventory: { slots: [], armor: [null, null, null, null], selected: 0 },
      mods: {},
      discoveries: [],
      heroesMet: [],
      kills: 0,
    };
    await putWorld(w);
    setActive(w);
  };

  if (active) {
    return (
      <Play
        save={active}
        rotated={rotated}
        onExit={() => {
          leaveImmersive();
          setActive(null);
          void refresh();
        }}
      />
    );
  }
  return (
    <div className={rotated ? "ma-root ma-rot" : "ma-root"}>
      <MainMenu
        worlds={worlds}
        onPlay={(w) => {
          enterImmersive();
          setActive(w);
        }}
        onCreate={(n, s) => void create(n, s)}
        onDelete={(w) => {
          void deleteWorld(w.id).then(refresh);
        }}
      />
    </div>
  );
}
