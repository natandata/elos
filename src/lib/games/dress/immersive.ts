// Tela cheia e celular deitado (como no MineArena). Chamar dentro de um toque da jogadora; no celular que não deixa travar a tela, a interface gira sozinha (ver LandscapeShell).

/** Celular/tablet: tela sensível ao toque como ponteiro principal. */
export const isCoarse = (): boolean => typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches;

export function enterImmersive(): void {
  if (!isCoarse()) return;
  const el = document.documentElement;
  void (el.requestFullscreen?.() ?? Promise.resolve())
    .then(() => (screen.orientation as ScreenOrientation & { lock?: (o: string) => Promise<void> }).lock?.("landscape"))
    .catch(() => undefined);
}

export function leaveImmersive(): void {
  try {
    (screen.orientation as ScreenOrientation & { unlock?: () => void }).unlock?.();
    if (document.fullscreenElement) void document.exitFullscreen();
  } catch {
    /* sem tela cheia, nada a desfazer */
  }
}
