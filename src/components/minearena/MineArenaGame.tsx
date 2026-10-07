"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { type DialogInfo, type HudState, MineArena } from "@/lib/minearena/game";
import { type WorldSave, deleteWorld, getWorld, listWorlds, putWorld } from "@/lib/minearena/save/save";
import { seedFromString } from "@/lib/minearena/world/noise";
import { findSpawn } from "@/lib/minearena/world/worldgen";
import { Hud, type Msg } from "./Hud";
import { InventoryPanel } from "./InventoryPanel";
import { MainMenu } from "./MainMenu";
import { setTheme } from "@/lib/minearena/audio/theme";
import { OptionsMenu } from "./OptionsMenu";
import { type Settings, loadSettings, saveSettings } from "@/lib/minearena/config/settings";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { type Peer, type RoomInfo, type RoomNet, joinRoom } from "@/lib/minearena/net/room";
import { AltarPanel } from "./AltarPanel";
import { MapView } from "./MapView";
import { SignEditor } from "./SignEditor";
import { TradePanel } from "./TradePanel";
import { ChatBox } from "./ChatBox";
import { DeathScreen, HeroDialog, LoadingScreen, PauseMenu } from "./Overlays";
import { TouchControls } from "./TouchControls";
import { StoryMenu } from "./StoryMenu";
import { StoryOverlay } from "./StoryOverlay";
import { loadProgress } from "@/lib/minearena/story/progress";
import { CHAPTER_BY_ID } from "@/lib/minearena/story/data/chapters";
import { STORY_MAPS } from "@/lib/minearena/story/maps";
import type { StoryProgress, StoryUi } from "@/lib/minearena/story/types";

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

function Play({ save, rotated, settings, onSettings, onExit, onStoryNav, storyChapter, me, sb, net }: { save: WorldSave; rotated: boolean; settings: Settings; onSettings: (s: Settings) => void; onExit: (notice?: string) => void; onStoryNav?: (to: { chapter: string } | { menu: true }) => void; storyChapter?: string; me?: Peer; sb?: SupabaseClient; net?: RoomNet }) {
  const mobile = useSyncExternalStore(subscribeCoarse, coarse, () => false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [game, setGame] = useState<MineArena | null>(null);
  const [hud, setHud] = useState<HudState | null>(null);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [dialog, setDialog] = useState<DialogInfo | null>(null);
  const [bag, setBag] = useState<null | "bag" | "craft" | "chest" | "furnace" | "altar">(null);
  const [extra, setExtra] = useState<null | { kind: "trade"; id: string } | { kind: "sign"; x: number; y: number; z: number; text: string } | { kind: "map" }>(null);
  const [paused, setPaused] = useState(false);
  const [options, setOptions] = useState(false);
  const [chat, setChat] = useState(false);
  const [storyUi, setStoryUi] = useState<StoryUi | null>(null);
  const onNavRef = useRef(onStoryNav);
  const onExitRef = useRef(onExit);
  const settingsRef = useRef(settings);
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
          onOpenContainer: (kind) => {
            g?.setUiOpen(true);
            setBag(kind);
          },
          onTrade: (id) => setExtra({ kind: "trade", id }),
          onEditSign: (x, y, z, text) => setExtra({ kind: "sign", x, y, z, text }),
          onOpenMap: () => setExtra({ kind: "map" }),
          onOpenCrafting: () => {
            g?.setUiOpen(true);
            setBag("craft");
          },
          onPauseRequest: () => {
            g?.setPaused(true);
            setPaused(true);
          },
          onRoomEnded: (reason) => onExitRef.current(reason),
          onStory: setStoryUi,
          onStoryNav: (to) => {
            void (gameRef.current?.saveNow() ?? Promise.resolve()).then(() => onNavRef.current?.(to));
          },
        },
        { mobile, settings: settingsRef.current, me, sb, net, story: storyChapter ? { chapterId: storyChapter } : undefined },
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

  useEffect(() => {
    settingsRef.current = settings;
    gameRef.current?.applySettings(settings);
    onNavRef.current = onStoryNav;
  }, [settings, onStoryNav]);

  const openBag = useCallback((tab: "bag" | "craft") => {
    gameRef.current?.setUiOpen(true);
    setBag(tab);
  }, []);
  const closeExtra = useCallback(() => {
    gameRef.current?.setUiOpen(false);
    setExtra(null);
  }, []);
  const closeBag = useCallback(() => {
    gameRef.current?.closeContainer();
    gameRef.current?.setUiOpen(false);
    setBag(null);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === "KeyT" && !paused && !dialog && !bag && !chat && !gameRef.current?.story) {
        e.preventDefault();
        gameRef.current?.setUiOpen(true);
        setChat(true);
        return;
      }
      if (extra) {
        if (e.code === "Escape") closeExtra();
        return;
      }
      if (gameRef.current?.story?.blocking) return;
      if (e.code === "KeyE" && !paused && !dialog && !chat) {
        if (bag) closeBag();
        else openBag("bag");
      }
      if (e.code === "Escape" && bag) closeBag();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [bag, paused, dialog, chat, extra, openBag, closeBag, closeExtra]);

  useEffect(() => {
    const noSelect = (e: Event) => {
      if (!(e.target instanceof Element && e.target.closest("input,textarea"))) e.preventDefault();
    };
    const clear = () => {
      const sel = window.getSelection();
      if (sel && !sel.isCollapsed) sel.removeAllRanges();
    };
    document.addEventListener("selectstart", noSelect);
    document.addEventListener("selectionchange", clear);
    return () => {
      document.removeEventListener("selectstart", noSelect);
      document.removeEventListener("selectionchange", clear);
    };
  }, []);

  const resume = () => {
    gameRef.current?.setPaused(false);
    setPaused(false);
  };

  return (
    <div className={rotated ? "ma-root ma-rot" : "ma-root"} data-touch={settings.touchSize} data-mobile={mobile ? "1" : "0"} onContextMenu={(e) => e.preventDefault()} onDragStart={(e) => e.preventDefault()}>
      <canvas ref={canvasRef} className="ma-canvas" />
      {game && hud && !hud.loading && !hud.cinematic && !paused && !options ? <Hud hud={hud} msgs={msgs} onSelect={(i) => game.inventory.select(i)} /> : null}
      {game && hud && !hud.loading && game.story ? <StoryOverlay game={game} ui={storyUi} hud={hud} /> : null}
      {game && hud && !hud.loading && mobile && !bag && !extra && !dialog && !paused && hud.alive && !hud.cinematic && !storyUi?.dialogue && !storyUi?.learn && !storyUi?.chapterEnd ? (
        <TouchControls game={game} rotated={rotated} shield={!!hud.offhand} swap={settings.swapButtons} onInventory={() => openBag("bag")} onPause={() => {
          game.setPaused(true);
          setPaused(true);
        }} />
      ) : null}
      {game && extra?.kind === "trade" ? <TradePanel game={game} villager={extra.id} onClose={closeExtra} /> : null}
      {game && extra?.kind === "map" ? <MapView game={game} onClose={closeExtra} /> : null}
      {game && extra?.kind === "sign" ? (
        <SignEditor
          initial={extra.text}
          onSave={(t) => {
            game.setSign(extra.x, extra.y, extra.z, t);
            closeExtra();
          }}
          onClose={closeExtra}
        />
      ) : null}
      {game && bag === "altar" ? <AltarPanel game={game} onClose={closeBag} /> : null}
      {game && bag && bag !== "altar" ? <InventoryPanel game={game} startTab={bag} rotated={rotated} onClose={closeBag} /> : null}
      {dialog && game ? <HeroDialog d={dialog} onAct={(a) => game.dialogAct(a)} /> : null}
      {paused && game && !options && hud?.alive !== false ? (
        <PauseMenu
          onResume={resume}
          coop={hud?.coop ?? null}
          canHost={!!me && !!sb}
          onOpenRoom={() => {
            void gameRef.current?.openRoom().then((ok) => {
              if (ok) resume();
            });
          }}
          onCloseRoom={() => {
            if (gameRef.current?.coopRole === "guest") void (gameRef.current?.saveNow() ?? Promise.resolve()).then(() => onExit());
            else gameRef.current?.closeRoom();
          }}
          onOptions={() => setOptions(true)}
          onExit={() => {
            void (gameRef.current?.saveNow() ?? Promise.resolve()).then(() => onExit());
          }}
        />
      ) : null}
      {hud && !hud.loading && !hud.cinematic && !game?.story ? (
        <button type="button" className="ma-chat-btn" aria-label="Conversar" onClick={() => { game?.setUiOpen(true); setChat(true); }}>
          💬
        </button>
      ) : null}
      {chat && game ? (
        <ChatBox
          onSend={(t) => game.sendChat(t)}
          onClose={() => {
            setChat(false);
            game.setUiOpen(false);
          }}
        />
      ) : null}
      {options && game ? <OptionsMenu settings={settings} mobile={mobile} onChange={onSettings} onDone={() => setOptions(false)} /> : null}
      {hud && !hud.alive && game ? <DeathScreen
          story={!!storyChapter}
          onRespawn={() => {
            setPaused(false);
            setOptions(false);
            setBag(null);
            game.respawn();
          }}
        /> : null}
      {!hud || hud.loading ? <LoadingScreen /> : null}
    </div>
  );
}

export function MineArenaGame({ me }: { me?: Peer }) {
  const mobile = useSyncExternalStore(subscribeCoarse, coarse, () => false);
  const portrait = useSyncExternalStore(subscribePortrait, portraitNow, () => false);
  // celular em pé (e sem trava de rotação): gira o jogo 90° pra ocupar a tela deitada
  const rotated = mobile && portrait;
  const [worlds, setWorlds] = useState<WorldSave[] | null>(null);
  const [active, setActive] = useState<WorldSave | null>(null);
  const [settings, setSettings] = useState<Settings>(loadSettings);
  const [menuOptions, setMenuOptions] = useState(false);
  const [sb] = useState<SupabaseClient | null>(() => (me ? createClient() : null));
  const [guestNet, setGuestNet] = useState<RoomNet | null>(null);
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [storyOpen, setStoryOpen] = useState(false);
  const [storyProgress, setStoryProgress] = useState<StoryProgress>(loadProgress);
  const [storySaves, setStorySaves] = useState<Set<string>>(new Set());
  // música no menu (dentro do mundo quem toca é o jogo, com a mesma faixa)
  useEffect(() => {
    if (active) return;
    const tick = () => setTheme(settings.music && !storyOpen, settings.volume / 100);
    tick();
    const id = window.setInterval(tick, 1600);
    window.addEventListener("pointerdown", tick);
    return () => {
      window.clearInterval(id);
      window.removeEventListener("pointerdown", tick);
    };
  }, [active, storyOpen, settings.music, settings.volume]);
  useEffect(() => () => setTheme(false, 0), []);
  const changeSettings = (s: Settings) => {
    setSettings(s);
    saveSettings(s);
  };

  const refresh = useCallback(async () => {
    const all = await listWorlds();
    setWorlds(all.filter((w) => !w.id.startsWith("story:")));
    setStorySaves(new Set(all.filter((w) => w.id.startsWith("story:") && w.story && !w.story.finished).map((w) => w.id.slice(6))));
    setStoryProgress(loadProgress());
  }, []);
  useEffect(() => {
    let on = true;
    void listWorlds().then((all) => {
      if (!on) return;
      setWorlds(all.filter((w) => !w.id.startsWith("story:")));
      setStorySaves(new Set(all.filter((w) => w.id.startsWith("story:") && w.story && !w.story.finished).map((w) => w.id.slice(6))));
    });
    return () => {
      on = false;
    };
  }, []);

  /** Modo História: abre (ou recomeça) o mapa limitado de um capítulo. */
  const startStory = async (chapterId: string, fresh: boolean) => {
    const ch = CHAPTER_BY_ID.get(chapterId);
    const map = ch?.map ? STORY_MAPS[ch.map] : undefined;
    if (!ch || !map) return;
    enterImmersive();
    const id = `story:${chapterId}`;
    let save = fresh ? null : await getWorld(id);
    if (!save) {
      const now = Date.now();
      save = {
        id,
        name: ch.title,
        seed: 1,
        createdAt: now,
        updatedAt: now,
        playedSeconds: 0,
        time: map.time,
        player: { x: map.spawn.x + 0.5, y: 40, z: map.spawn.z + 0.5, yaw: map.spawn.yaw, pitch: 0, health: 20, hunger: 20 },
        spawn: { x: map.spawn.x + 0.5, y: 40, z: map.spawn.z + 0.5 },
        inventory: { slots: [], armor: [null, null, null, null], selected: 0 },
        mods: {},
        mode: "survival",
        discoveries: [],
        heroesMet: [],
        kills: 0,
      };
      await putWorld(save);
    }
    setActive(save);
  };

  const create = async (name: string, seedText: string, mode: "survival" | "creative") => {
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
      mode,
      discoveries: [],
      heroesMet: [],
      kills: 0,
    };
    await putWorld(w);
    setActive(w);
  };

  /** Convidado: conecta na sala, espera o aceite e monta um mundo local com a seed do anfitrião. */
  const join = async (r: RoomInfo) => {
    if (!me || !sb || joining) return;
    setJoining(true);
    setJoinError(null);
    try {
      const { net, welcome } = await joinRoom(sb, me, r.hostId);
      enterImmersive();
      const profile = await getWorld("visitante");
      const now = Date.now();
      const h = welcome.host;
      const w: WorldSave = {
        id: "coop-guest",
        name: `Sala de ${r.hostName}`,
        seed: welcome.seed,
        createdAt: now,
        updatedAt: now,
        playedSeconds: profile?.playedSeconds ?? 0,
        time: welcome.time,
        player: { x: h.x + 1.5, y: h.y + 0.5, z: h.z + 1.5, yaw: 0, pitch: 0, health: profile?.player.health ?? 20, hunger: profile?.player.hunger ?? 20 },
        spawn: welcome.spawn,
        inventory: profile?.inventory ?? { slots: [], armor: [null, null, null, null], selected: 0 },
        mods: {},
        landmarks: (welcome.lm ?? []) as WorldSave["landmarks"],
        discoveries: profile?.discoveries ?? [],
        heroesMet: profile?.heroesMet ?? [],
        kills: profile?.kills ?? 0,
      };
      setGuestNet(net);
      setActive(w);
    } catch (e) {
      setJoinError(e instanceof Error ? e.message : "Não foi possível entrar na sala.");
    } finally {
      setJoining(false);
    }
  };

  if (active) {
    return (
      <Play
        key={active.id}
        save={active}
        storyChapter={active.id.startsWith("story:") ? active.id.slice(6) : undefined}
        onStoryNav={(to) => {
          if ("chapter" in to) void startStory(to.chapter, true);
          else {
            leaveImmersive();
            setActive(null);
            setStoryOpen(true);
            void refresh();
          }
        }}
        me={me}
        sb={sb ?? undefined}
        net={guestNet ?? undefined}
        rotated={rotated}
        settings={settings}
        onSettings={changeSettings}
        onExit={(why) => {
          leaveImmersive();
          guestNet?.close();
          setGuestNet(null);
          if (active.id.startsWith("story:")) setStoryOpen(true);
          setActive(null);
          if (why) setNotice(why);
          void refresh();
        }}
      />
    );
  }
  if (storyOpen) {
    return (
      <div className={rotated ? "ma-root ma-rot" : "ma-root"} onContextMenu={(e) => e.preventDefault()}>
        <StoryMenu
          progress={storyProgress}
          hasSave={(id) => storySaves.has(id)}
          onPlay={(id, fresh) => void startStory(id, fresh)}
          onBack={() => setStoryOpen(false)}
        />
      </div>
    );
  }
  return (
    <div className={rotated ? "ma-root ma-rot" : "ma-root"} onContextMenu={(e) => e.preventDefault()}>
      <MainMenu
        notice={notice}
        coop={me && sb ? { sb, myId: me.id, busy: joining, error: joinError, onJoin: (r) => void join(r) } : undefined}
        worlds={worlds}
        onOptions={() => setMenuOptions(true)}
        onStory={() => {
          void refresh();
          setStoryOpen(true);
        }}
        onPlay={(w) => {
          enterImmersive();
          setActive(w);
        }}
        onCreate={(n, s, m) => void create(n, s, m)}
        onDelete={(w) => {
          void deleteWorld(w.id).then(refresh);
        }}
      />
      {menuOptions ? <OptionsMenu settings={settings} mobile={mobile} onChange={changeSettings} onDone={() => setMenuOptions(false)} /> : null}
    </div>
  );
}
