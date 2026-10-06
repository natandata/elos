// Trilha de fundo compartilhada entre o menu e o jogo: um único <audio> em loop,
// para a música seguir sem reiniciar quando se entra no mundo.

let el: HTMLAudioElement | null = null;
let lastTry = 0;

/** Liga/desliga a trilha. Chame com frequência: ela só reinicia a reprodução a cada 1,5 s
 *  (o navegador bloqueia o áudio até o primeiro toque do jogador). */
export function setTheme(want: boolean, volume: number): void {
  if (!el) {
    if (!want) return;
    el = new Audio("/minearena/tema.mp3");
    el.loop = true;
  }
  el.volume = Math.max(0, Math.min(1, 0.32 * volume));
  if (!want) {
    if (!el.paused) el.pause();
    return;
  }
  const now = performance.now();
  if (el.paused && now - lastTry > 1500) {
    lastTry = now;
    el.play().catch(() => {
      // bloqueado até o primeiro toque; tenta de novo
    });
  }
}
