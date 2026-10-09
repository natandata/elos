"use client";

import { useEffect, useState } from "react";
import { applause, isMuted, onMuteChange, setMuted, startMusic, stopMusic } from "@/lib/games/dress/sfx";

/** Liga e desliga os sons do jogo (a escolha fica guardada). */
export function SoundToggle({ className = "vh-iconbtn" }: { className?: string }) {
  const [off, setOff] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setOff(isMuted()), 0);
    const un = onMuteChange(() => setOff(isMuted()));
    return () => {
      clearTimeout(t);
      un();
    };
  }, []);
  return (
    <button type="button" className={className} aria-label={off ? "Ligar o som" : "Desligar o som"} aria-pressed={!off} onClick={() => setMuted(!off)}>
      {off ? "🔇" : "🔊"}
    </button>
  );
}

/** Música de passarela enquanto a modelo desfila. */
export function RunwayAudio() {
  useEffect(() => {
    startMusic();
    const un = onMuteChange(() => (isMuted() ? stopMusic() : startMusic()));
    return () => {
      un();
      stopMusic();
    };
  }, []);
  return null;
}

/** Aplausos ao entrar no pódio. */
export function ApplauseOnMount() {
  useEffect(() => {
    const t = setTimeout(() => applause(), 350);
    return () => clearTimeout(t);
  }, []);
  return null;
}
