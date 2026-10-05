import Link from "next/link";
import { PageHeader } from "@/components/ui";
import { requireRole } from "@/lib/auth";
import { GAME_RELEASES, isReleased } from "@/lib/games/release";

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
  { href: "/app/jogos/colecao", emoji: "🃏", title: "Coleção de cartas", hint: "Cartas ganhas nos jogos" },
];

const TOOLS = [
  { href: "/app/admin/torneios", emoji: "🏆", title: "Torneios da Arena", hint: "Criar e acompanhar torneios" },
  { href: "/app/admin/arena", emoji: "🏰", title: "Arena hoje", hint: "Partidas por jogador no dia" },
  { href: "/app/admin/passarela", emoji: "📸", title: "Passarela", hint: "Looks publicados e moderação" },
];

export default async function AdminJogosPage() {
  await requireRole("admin");

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
