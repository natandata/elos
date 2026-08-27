/** Nome amigável de cada rota, pra o admin ver "em qual tela" alguém está. */
const SCREEN_LABEL: Record<string, string> = {
  "/app": "Início",
  "/app/admin": "Dashboard",
  "/app/admin/geral": "Geral",
  "/app/admin/usuarios": "Usuários",
  "/app/admin/elos": "ELOS",
  "/app/admin/missoes": "Missões",
  "/app/admin/monitorar-chat": "Monitorar Chat",
  "/app/admin/relatorio": "Relatório",
  "/app/admin/auditoria": "Auditoria",
  "/app/admin/status-equipe": "Status Equipe",
  "/app/lider": "Início",
  "/app/lider/missoes": "Missões",
  "/app/lider/status-crias": "Status Crias",
  "/app/cria": "Início",
  "/app/cria/missoes": "Missões",
  "/app/ranking": "Meu Elo",
  "/app/agenda": "Agenda",
  "/app/chat": "Chat",
  "/app/notificacoes": "Notificações",
  "/app/perfil": "Perfil",
  "/app/status": "Status diário",
  "/app/responsavel": "Autorização do responsável",
  "/app/completar-perfil": "Completar cadastro",
};

/** Casa o caminho mais específico primeiro (ex.: /app/admin/elos/123 → ELOS). */
export function screenLabel(path: string): string {
  if (SCREEN_LABEL[path]) return SCREEN_LABEL[path];
  const prefixes = Object.keys(SCREEN_LABEL)
    .filter((p) => p !== "/app" && path.startsWith(p + "/"))
    .sort((a, b) => b.length - a.length);
  if (prefixes[0]) return SCREEN_LABEL[prefixes[0]];
  return path;
}
