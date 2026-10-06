// Música de fundo da Arena (menus e lobbies). Um único <audio> em loop, que para
// durante a partida (a partida tem os próprios efeitos) e respeita o botão de som.
// O navegador só libera áudio depois de um toque do jogador.

const OFF_KEY = "arena-music-off";
const SRC = "/arena/tema.mp3";
const VOLUME = 0.28;

let audio: HTMLAudioElement | null = null;
let suspended = 0;
let wanted = false;
const listeners = new Set<() => void>();

export function readMusicOff(): boolean {
  try {
    return localStorage.getItem(OFF_KEY) === "1";
  } catch {
    return false;
  }
}

export function writeMusicOff(off: boolean) {
  try {
    localStorage.setItem(OFF_KEY, off ? "1" : "0");
  } catch {
    // sem armazenamento: vale só nesta sessão
  }
}

function el(): HTMLAudioElement {
  if (!audio) {
    audio = new Audio(SRC);
    audio.loop = true;
    audio.preload = "none";
    audio.volume = VOLUME;
  }
  return audio;
}

function sync() {
  const a = el();
  if (wanted && suspended === 0 && !readMusicOff() && document.visibilityState === "visible") {
    a.play().catch(() => {
      // bloqueado até o primeiro toque; tentamos de novo no próximo
    });
  } else {
    a.pause();
  }
  listeners.forEach((f) => f());
}

/** Liga a música desta tela (chame ao montar; devolve a função de desligar). */
export function mountMusic(): () => void {
  wanted = true;
  const onVis = () => sync();
  const onTouch = () => {
    if (audio?.paused) sync();
  };
  document.addEventListener("visibilitychange", onVis);
  window.addEventListener("pointerdown", onTouch);
  sync();
  return () => {
    wanted = false;
    document.removeEventListener("visibilitychange", onVis);
    window.removeEventListener("pointerdown", onTouch);
    audio?.pause();
  };
}

/** Pausa a música enquanto algo (a partida) estiver montado. */
export function suspendMusic(): () => void {
  suspended++;
  sync();
  return () => {
    suspended = Math.max(0, suspended - 1);
    sync();
  };
}

export function setMusicOff(off: boolean) {
  writeMusicOff(off);
  sync();
}

export function subscribeMusic(f: () => void): () => void {
  listeners.add(f);
  return () => {
    listeners.delete(f);
  };
}
