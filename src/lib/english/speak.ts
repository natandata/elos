// Voz do navegador (speechSynthesis): grátis, sem enviar nada para fora. Só roda no cliente.
// Em alguns aparelhos não há voz em inglês: a tela mostra o texto no lugar (canSpeak() fica falso).

let cached: SpeechSynthesisVoice | null = null;

export function canSpeak(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window && typeof SpeechSynthesisUtterance !== "undefined";
}

function pickVoice(): SpeechSynthesisVoice | null {
  if (cached) return cached;
  const voices = window.speechSynthesis.getVoices();
  const en = voices.filter((v) => v.lang.toLowerCase().startsWith("en"));
  cached = en.find((v) => v.lang.toLowerCase() === "en-us") ?? en[0] ?? null;
  return cached;
}

/** Fala a frase em inglês. `rate` 0.6 = devagar, 0.9 = normal. */
export function speak(text: string, rate = 0.9): void {
  if (!canSpeak()) return;
  try {
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "en-US";
    const v = pickVoice();
    if (v) u.voice = v;
    u.rate = rate;
    window.speechSynthesis.speak(u);
  } catch {
    // sem voz: ignora
  }
}

export function stopSpeaking(): void {
  if (canSpeak()) window.speechSynthesis.cancel();
}
