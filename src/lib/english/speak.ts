// Voz do navegador (speechSynthesis): grátis, sem enviar nada para fora. Só roda no cliente.
// Cuidados que o Safari do iPhone exige: tocar a partir de um toque do aluno, esperar a lista de vozes carregar,
// não cancelar logo antes de falar, manter a frase viva até terminar e avisar quando nada tocou.

let cached: SpeechSynthesisVoice | null = null;
// o iOS descarta a frase se nada a referencia: guarda a atual
let current: SpeechSynthesisUtterance | null = null;
// WAV mudo de 0,1 s: tocá-lo no toque do aluno põe o áudio do iPhone em modo "reprodução" (passa a ignorar o botão de silêncio)
const SILENT_WAV = "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=";
function unlockAudio(): void {
  try {
    const a = new Audio(SILENT_WAV);
    a.volume = 0.01;
    void a.play().catch(() => null);
  } catch {
    // sem Audio: segue só com a voz
  }
}

export function canSpeak(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window && typeof SpeechSynthesisUtterance !== "undefined";
}

function refreshVoice(): SpeechSynthesisVoice | null {
  const voices = window.speechSynthesis.getVoices();
  const en = voices.filter((v) => v.lang.toLowerCase().replace("_", "-").startsWith("en"));
  cached = en.find((v) => v.lang.toLowerCase().replace("_", "-") === "en-us") ?? en[0] ?? null;
  return cached;
}

/** Chame uma vez ao abrir a tela: no iOS/Chrome as vozes chegam depois (evento voiceschanged). */
export function prepareVoices(): void {
  if (!canSpeak()) return;
  refreshVoice();
  try {
    window.speechSynthesis.addEventListener("voiceschanged", refreshVoice);
  } catch {
    // navegador sem addEventListener na síntese: segue sem
  }
}

/**
 * Fala a frase em inglês (`rate` 0.55 = devagar, 0.9 = normal). `onResult(true)` quando começou a tocar;
 * `onResult(false)` se nada tocou (modo silencioso, sem voz, bloqueio do navegador): a tela mostra um aviso.
 */
export function speak(text: string, rate = 0.9, onResult?: (played: boolean) => void, fromTap = false): void {
  if (!canSpeak()) {
    onResult?.(false);
    return;
  }
  try {
    const synth = window.speechSynthesis;
    if (fromTap) unlockAudio();
    // só limpa o que estiver tocando/pendente; um cancel() em fila vazia derruba a próxima fala no iOS
    if (synth.speaking || synth.pending) synth.cancel();
    if (synth.paused) synth.resume();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "en-US";
    const v = cached ?? refreshVoice();
    if (v) u.voice = v;
    u.rate = rate;
    u.pitch = 1;
    u.volume = 1;
    let started = false;
    u.onstart = () => {
      started = true;
      onResult?.(true);
    };
    u.onerror = (e) => {
      // "canceled"/"interrupted" são só a fala anterior sendo trocada pela nova
      if (!started && e.error !== "canceled" && e.error !== "interrupted") onResult?.(false);
    };
    u.onend = () => {
      if (current === u) current = null;
    };
    current = u;
    // o iOS só toca se speak() rodar dentro do próprio toque: nada de setTimeout antes
    synth.speak(u);
    // se em 1 s nada começou, tenta de novo sem escolher voz; se ainda assim nada, avisa
    setTimeout(() => {
      if (started) return;
      try {
        const u2 = new SpeechSynthesisUtterance(text);
        u2.lang = "en-US";
        u2.rate = rate;
        u2.onstart = () => {
          started = true;
          onResult?.(true);
        };
        current = u2;
        synth.cancel();
        synth.speak(u2);
      } catch {
        // sem plano B
      }
      setTimeout(() => {
        if (!started) onResult?.(false);
      }, 1500);
    }, 1000);
  } catch {
    onResult?.(false);
  }
}

export function stopSpeaking(): void {
  if (canSpeak()) window.speechSynthesis.cancel();
}
