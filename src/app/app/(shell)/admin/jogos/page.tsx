import Link from "next/link";
import { PageHeader } from "@/components/ui";
import { requireRole } from "@/lib/auth";
import { EarlyAccessManager, type EAUser } from "@/components/games/EarlyAccessManager";
import { GAME_RELEASES, isReleased, type ReleasedGame } from "@/lib/games/release";
import { GAME_CATALOG } from "@/lib/games/catalog";
import { getVisibilities } from "@/lib/games/releaseServer";
import { GameVisibility, type VisRow } from "@/components/games/GameVisibility";
import { createAdminClient } from "@/lib/supabase/admin";
import { ArenaDifficulty } from "@/components/games/ArenaDifficulty";
import { loadArenaDifficulty } from "@/lib/arena/difficultyServer";

const RELEASE_TITLES: Record<ReleasedGame, string> = { dress: "👗 Vista o Herói (inclui a Passarela)", minearena: "⛏️ MineArena", biblerush: "🛶 Bible Rush", arenasoccer: "⚽ ArenaSoccer", arenacampanha: "🛡️ Campanha da Arena" };

type Game = { href: string; emoji: string; title: string; hint: string; release?: keyof typeof GAME_RELEASES; needsElo?: boolean };

const GAMES: Game[] = [
  { href: "/app/jogos/quiz", emoji: "🧠", title: "Quiz do Dia", hint: "5 perguntas, 3 dificuldades e treino" },
  { href: "/app/jogos/versiculo", emoji: "📖", title: "Complete o Versículo", hint: "3 lacunas por dia" },
  { href: "/app/jogos/quem-sou-eu", emoji: "🕵️", title: "Quem Sou Eu?", hint: "Dicas e palpites, dá carta" },
  { href: "/app/jogos/ordem", emoji: "⏳", title: "Ordene os Fatos", hint: "Ordem dos acontecimentos bíblicos" },
  { href: "/app/jogos/arena", emoji: "🏰", title: "Arena dos Heróis", hint: "Batalha contra o computador, baús, baralho e ranking" },
  { href: "/app/jogos/arena/pvp", emoji: "⚔️", title: "Arena 1x1", hint: "Precisa de um colega no mesmo Elo", needsElo: true },
  { href: "/app/jogos/arena/duplas", emoji: "👥", title: "Arena em Duplas", hint: "Precisa de 3 colegas no mesmo Elo", needsElo: true },
  { href: "/app/jogos/arena/torneios", emoji: "🏆", title: "Torneios da Arena (visão do jogador)", hint: "Inscrição e chaveamento como o jogador vê" },
  { href: "/app/jogos/arena/missoes", emoji: "🎯", title: "Missões da Arena", hint: "Missões diárias com troféus" },
  { href: "/app/jogos/memoria", emoji: "🃏", title: "Memória dos Heróis", hint: "Treino solo e corrida com colega do Elo" },
  { href: "/app/jogos/duelo", emoji: "⚡", title: "Duelo 1x1 do Quiz", hint: "Precisa de um colega no mesmo Elo", needsElo: true },
  { href: "/app/jogos/vestir", emoji: "👗", title: "Vista o Herói", hint: "Desafio do dia, treino, Bilhetes Dourados", release: "dress" },
  { href: "/app/jogos/vestir/passarela", emoji: "📸", title: "Passarela (Vista o Herói)", hint: "Look livre, votação e prêmios", release: "dress" },
  { href: "/app/jogos/minearena", emoji: "⛏️", title: "MineArena", hint: "Sandbox voxel 3D: construir, explorar e enfrentar", release: "minearena" },
  { href: "/app/jogos/biblerush", emoji: "🛶", title: "Bible Rush", hint: "Gerenciamento de tempo bíblico: Noé, Reunindo os Animais", release: "biblerush" },
  { href: "/app/jogos/arenasoccer", emoji: "⚽", title: "ArenaSoccer", hint: "Futebol arcade 2D de física, 1x1 a 4x4 contra o computador (vendido na Loja)", release: "arenasoccer" },
  { href: "/app/jogos/colecao", emoji: "🃏", title: "Coleção de cartas", hint: "Cartas ganhas nos jogos" },
];

const TOOLS = [
  { href: "/app/admin/loja", emoji: "🛍️", title: "Loja", hint: "Jogos com data de lançamento e em produção na vitrine" },
  { href: "/app/admin/torneios", emoji: "🏆", title: "Torneios da Arena", hint: "Criar e acompanhar torneios" },
  { href: "/app/admin/arena", emoji: "🏰", title: "Arena hoje", hint: "Partidas por jogador no dia" },
  { href: "/app/admin/passarela", emoji: "📸", title: "Passarela", hint: "Looks publicados e moderação" },
];

export default async function AdminJogosPage() {
  await requireRole("admin");

  const vis = await getVisibilities();
  const arenaDifficulty = await loadArenaDifficulty(createAdminClient());
  const rows: VisRow[] = GAME_CATALOG.map((g) => {
    const rel = g.key in GAME_RELEASES ? (g.key as ReleasedGame) : null;
    const when = rel ? new Date(GAME_RELEASES[rel]).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", timeZone: "America/Sao_Paulo" }) : null;
    const v = vis[g.key];
    const now = v === "visible" ? "Todos os jogadores veem agora." : v === "hidden" ? "Escondido: só você (admin) e quem tem acesso antecipado veem." : rel && !isReleased(rel) ? `Automático: fechado até ${when}.` : "Automático: aberto para todos.";
    return { key: g.key, emoji: g.emoji, title: g.title, visibility: v, note: now };
  });
  // o acesso antecipado vale para jogos ainda fechados pela data e para jogos escondidos pelo botão de visibilidade
  const pending = (Object.keys(GAME_RELEASES) as ReleasedGame[]).filter((g) => !isReleased(g) || vis[g] === "hidden");
  let users: EAUser[] = [];
  const granted = new Map<string, string[]>();
  const db = pending.length > 0 ? createAdminClient() : null;
  if (db) {
    const [{ data: profs }, { data: acc }] = await Promise.all([
      db.from("profiles").select("id, full_name, elos(name)").in("role", ["cria", "leader"]).eq("is_test_account", false).order("full_name").limit(1000),
      db.from("game_early_access").select("game, user_id").in("game", pending),
    ]);
    users = ((profs ?? []) as unknown as { id: string; full_name: string | null; elos: { name: string } | { name: string }[] | null }[]).map((p) => ({
      id: p.id,
      name: p.full_name || "Sem nome",
      elo: (Array.isArray(p.elos) ? p.elos[0]?.name : p.elos?.name) ?? null,
    }));
    for (const a of (acc ?? []) as { game: string; user_id: string }[]) granted.set(a.game, [...(granted.get(a.game) ?? []), a.user_id]);
  }

  return (
    <>
      <PageHeader title="🎮 Sala de Jogos" subtitle="Teste todos os jogos, inclusive os que ainda não estão liberados para os jogadores, e acesse as ferramentas de admin." />

      <section className="mb-6">
        <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-[var(--muted)]">Testar jogos</h2>
        <p className="mb-3 text-xs text-[var(--muted)]">
          Você joga com a sua conta de admin: não aparece nos rankings e não conta nos números dos jogadores. Para testar duelos, 1x1 e duplas (precisam de um Elo), use “Visualizar como” em Usuários.
        </p>
        <ul className="space-y-2">
          {GAMES.map((g) => {
            const open = g.release ? isReleased(g.release) : true;
            return (
              <li key={g.href}>
                <Link href={g.href} className="card flex items-center gap-3 p-3 transition active:scale-[0.99]">
                  <span className="text-3xl" aria-hidden>
                    {g.emoji}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-black leading-tight">{g.title}</span>
                    <span className="block text-xs text-[var(--muted)]">{g.hint}</span>
                    {g.needsElo ? <span className="block text-[11px] font-bold text-amber-700">Admin não tem Elo: abra pelo “Visualizar como”</span> : null}
                  </span>
                  {open ? (
                    <span className="shrink-0 rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-black text-emerald-800">Disponível</span>
                  ) : (
                    <span className="shrink-0 rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-black text-amber-800">
                      Só admin · abre {new Date(GAME_RELEASES[g.release!]).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", timeZone: "America/Sao_Paulo" })}
                    </span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="mb-6">
        <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-[var(--muted)]">Visibilidade para os jogadores</h2>
        <p className="mb-3 text-xs text-[var(--muted)]">
          Automático segue a data de lançamento (jogos sem data ficam abertos). Visível abre para todos agora. Oculto esconde o jogo de todos, só você e quem tem acesso antecipado continuam vendo.
        </p>
        <GameVisibility rows={rows} />
      </section>

      <section className="mb-6">
        <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-[var(--muted)]">Dificuldade da Arena</h2>
        <ArenaDifficulty current={arenaDifficulty} />
      </section>

      {pending.length > 0 ? (
        <section className="mb-6">
          <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-[var(--muted)]">Acesso antecipado</h2>
          <p className="mb-3 text-xs text-[var(--muted)]">Libere um jogo ainda não lançado, ou escondido por você, para jogadores específicos: eles veem e jogam já. Para todos os outros ele continua fechado ou oculto.</p>
          <div className="space-y-3">
            {pending.map((g) => (
              <EarlyAccessManager key={g} game={g} title={RELEASE_TITLES[g]} users={users} granted={granted.get(g) ?? []} />
            ))}
          </div>
        </section>
      ) : null}

      <section>
        <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-[var(--muted)]">Ferramentas de admin</h2>
        <ul className="space-y-2">
          {TOOLS.map((t) => (
            <li key={t.href}>
              <Link href={t.href} className="card flex items-center gap-3 p-3 transition active:scale-[0.99]">
                <span className="text-3xl" aria-hidden>
                  {t.emoji}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-black leading-tight">{t.title}</span>
                  <span className="block text-xs text-[var(--muted)]">{t.hint}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
