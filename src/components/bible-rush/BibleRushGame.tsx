"use client";

import { useEffect, useRef, useState } from "react";
import { RushLevel, type Result } from "@/lib/bible-rush/core/engine";
import type { LevelDef, SaveData, Settings } from "@/lib/bible-rush/core/types";
import { RushAudio } from "@/lib/bible-rush/audio/audio";
import { newlyUnlocked, type Achievement } from "@/lib/bible-rush/data/achievements";
import { CUTSCENES } from "@/lib/bible-rush/data/cutscenes";
import { CAMPAIGN, NOAH_ANIMALS, challengeLevel } from "@/lib/bible-rush/data/levels";
import { SPECIES_GALLERY } from "@/lib/bible-rush/data/gallery";
import { freshSave, loadSave, resetSave, writeSave } from "@/lib/bible-rush/save/save";
import { CutscenePlayer } from "./Cutscene";
import { Playfield } from "./Playfield";
import { AchievementsScreen, ChallengeScreen, ChapterSelect, GalleryScreen, MenuScreen, ResultScreen, SettingsScreen, type ScreenId } from "./Screens";

type View = { kind: "screen"; id: ScreenId } | { kind: "cutscene"; id: string; then: () => void } | { kind: "play" } | { kind: "result" };

/** Bible Rush: orquestra menu, cutscenes, fase, resultado e progresso salvo. */
export function BibleRushGame({ uid }: { uid: string }) {
  const [save, setSave] = useState<SaveData>(() => loadSave(uid));
  const [view, setView] = useState<View>({ kind: "screen", id: "menu" });
  const [level, setLevel] = useState<RushLevel | null>(null);
  const [runId, setRunId] = useState(0);
  const [outcome, setOutcome] = useState<{ def: LevelDef; result: Result; newAch: Achievement[]; hasNext: boolean } | null>(null);
  const [rushAudio] = useState(() => new RushAudio());
  const saveRef = useRef(save);
  const settings = save.settings;

  useEffect(() => {
    saveRef.current = save;
  });
  useEffect(() => {
    rushAudio.configure(settings.volume, settings.sfx, settings.music);
  }, [rushAudio, settings.volume, settings.sfx, settings.music]);
  useEffect(() => () => rushAudio.dispose(), [rushAudio]);

  const audio = () => rushAudio;
  const commit = (next: SaveData) => {
    setSave(next);
    saveRef.current = next;
    writeSave(uid, next);
  };

  const go = (id: ScreenId) => setView({ kind: "screen", id });
  const menu = () => (rushAudio.stopMusic(), setLevel(null), go("menu"));

  const begin = (def: LevelDef, mode: "campaign" | "survival" | "speed" | "perfect") => {
    const a = audio();
    if (settings.music) a.startMusic();
    const lv = new RushLevel(def, { seed: (Date.now() & 0xffff) + 1, mode, tutorial: mode === "campaign" && def.tutorial && !save.tutorialDone });
    setLevel(lv);
    setRunId((n) => n + 1);
    setView({ kind: "play" });
  };

  const startCampaign = (def: LevelDef) => {
    audio();
    const play = () => begin(def, "campaign");
    if (!save.seenIntro.includes(def.id)) {
      commit({ ...save, seenIntro: [...save.seenIntro, def.id] });
      setView({ kind: "cutscene", id: def.intro, then: play });
    } else play();
  };

  const finish = () => {
    const lv = level;
    const cur = saveRef.current;
    if (!lv || !lv.result || !cur) return;
    const result = lv.result;
    const def = lv.def;
    const next: SaveData = { ...cur, stars: { ...cur.stars }, bestScores: { ...cur.bestScores }, challengeBest: { ...cur.challengeBest }, gallery: [...cur.gallery], achievements: [...cur.achievements] };
    next.tutorialDone = true;
    next.totalServed += result.served;
    next.serveStreak = result.abandoned === 0 ? cur.serveStreak + result.served : lv.streak;
    for (const sp of lv.servedSpecies) {
      const g = SPECIES_GALLERY[sp];
      if (!next.gallery.includes(g)) next.gallery.push(g);
    }
    if (result.mode === "campaign") {
      if (result.won) {
        next.stars[def.id] = Math.max(next.stars[def.id] ?? 0, result.stars);
        next.unlockedChapter = Math.max(next.unlockedChapter, def.number + 1);
        if (!next.gallery.includes("door")) next.gallery.push("door");
      }
      next.bestScores[def.id] = Math.max(next.bestScores[def.id] ?? 0, result.score);
    } else next.challengeBest[result.mode] = Math.max(next.challengeBest[result.mode] ?? 0, result.score);
    const newAch = newlyUnlocked({ save: next, result, levelId: def.id });
    next.achievements.push(...newAch.map((a) => a.id));
    commit(next);
    setOutcome({ def, result, newAch, hasNext: result.mode === "campaign" && result.won && CAMPAIGN.some((c) => c.number === def.number + 1) });
    rushAudio.stopMusic();
    if (result.mode === "campaign" && result.won) setView({ kind: "cutscene", id: def.outro, then: () => setView({ kind: "result" }) });
    else setView({ kind: "result" });
  };

  const changeSettings = (s: Settings) => {
    commit({ ...save, settings: s });
  };

  const retry = () => {
    if (!outcome) return;
    if (outcome.result.mode === "campaign") begin(outcome.def, "campaign");
    else begin(outcome.def, outcome.result.mode);
  };

  let body: React.ReactNode = null;
  if (view.kind === "cutscene") {
    const sc = CUTSCENES[view.id];
    body = <CutscenePlayer key={view.id} scene={sc} settings={settings} onDone={view.then} />;
  } else if (view.kind === "play" && level) {
    body = <Playfield key={runId} level={level} audio={rushAudio} settings={settings} title={level.def.title} onEnd={finish} onQuit={menu} />;
  } else if (view.kind === "result" && outcome) {
    body = <ResultScreen level={outcome.def} result={outcome.result} newAch={outcome.newAch} hasNext={outcome.hasNext} onRetry={retry} onMenu={menu} />;
  } else if (view.kind === "screen") {
    switch (view.id) {
      case "menu":
        body = (
          <MenuScreen
            save={save}
            onContinue={() => startCampaign(NOAH_ANIMALS)}
            onNew={() => {
              resetSave(uid);
              const f = freshSave();
              f.settings = settings;
              commit(f);
              startCampaign(NOAH_ANIMALS);
            }}
            go={go}
          />
        );
        break;
      case "chapters":
        body = <ChapterSelect save={save} onPlay={startCampaign} onBack={menu} />;
        break;
      case "challenge":
        body = <ChallengeScreen save={save} onPlay={(m) => begin(challengeLevel(m), m)} onBack={menu} />;
        break;
      case "achievements":
        body = <AchievementsScreen save={save} onBack={menu} />;
        break;
      case "gallery":
        body = <GalleryScreen save={save} onBack={menu} />;
        break;
      case "settings":
        body = <SettingsScreen settings={settings} onChange={changeSettings} onBack={menu} />;
        break;
    }
  }

  return <div className={`br-root ${settings.uiScale === "large" ? "br-large" : ""}`}>{body}</div>;
}
