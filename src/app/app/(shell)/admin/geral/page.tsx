import { Bar, Card, PageHeader } from "@/components/ui";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

// Limites do plano Free do Supabase (banco de dados do projeto).
const DB_LIMIT_BYTES = 500 * 1024 * 1024; // 500 MB
const STORAGE_LIMIT_BYTES = 1024 * 1024 * 1024; // 1 GB

type Health = {
  db_size_bytes: number;
  storage_bytes: number;
  postgres_version: string;
  counts: Record<string, number>;
};

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB", "TB"];
  let value = bytes;
  let i = -1;
  do {
    value /= 1024;
    i++;
  } while (value >= 1024 && i < units.length - 1);
  return `${value.toFixed(value < 10 ? 1 : 0)} ${units[i]}`;
}

function pct(value: number, total: number): number {
  return total > 0 ? Math.min(100, Math.round((value / total) * 100)) : 0;
}

const COUNT_LABEL: Record<string, string> = {
  profiles: "Usuários",
  missions: "Missões",
  chat_messages: "Mensagens de chat",
  notifications: "Notificações",
  events: "Eventos",
  status_responses: "Respostas de status",
  audit_log: "Registros de auditoria",
};

type Feature = { title: string; items: string[] };

const ADMIN_FEATURES: Feature[] = [
  { title: "Painel", items: ["Visão geral de usuários, missões e status emocional/espiritual agregado"] },
  { title: "Usuários", items: [
    "Criar, editar e excluir contas",
    "Aprovar líderes pendentes",
    "Redefinir senha e enviar e-mail",
    "Exportar lista em CSV",
  ]},
  { title: "ELOS", items: [
    "Ver estrutura, ranking e XP de cada Elo",
    "Abrir um Elo: liderança, crias e missões em curso, tudo num lugar",
  ]},
  { title: "Missões", items: [
    "Criar, editar e aprovar missões de qualquer Elo",
    "Duplicar qualquer missão como modelo",
  ]},
  { title: "Monitorar Chat", items: ["Ler (somente leitura) o chat de qualquer Elo"] },
  { title: "Relatório", items: [
    "Quantos crias responderam \"Mal\" na semana",
    "Elos sem líder aprovado",
    "Líderes sem login há 14+ dias",
  ]},
  { title: "Auditoria", items: ["Quem trocou role, Elo ou aprovação, e quem excluiu um usuário — e quando"] },
  { title: "Status Equipe", items: ["Acompanhamento emocional/espiritual de todos os líderes"] },
  { title: "Agenda", items: ["Criar eventos para todos os ELOS, um Elo específico, ou só para a liderança"] },
];

const LEADER_FEATURES: Feature[] = [
  { title: "Início", items: ["Dashboard do Elo: XP médio, ranking, missões e alerta imediato de \"Mal\""] },
  { title: "Meu Elo", items: [
    "Ranking dos crias do próprio Elo",
    "Ranking entre líderes (missões criadas, XP, conclusões)",
  ]},
  { title: "Missões", items: [
    "Criar missões individuais ou coletivas (meta do Elo)",
    "Aprovar ou recusar o que os crias enviarem",
    "Duplicar missão como modelo",
  ]},
  { title: "Status Crias", items: [
    "Ver histórico e gráfico de tendência de cada cria",
    "Registrar o que foi feito depois de um alerta \"Mal\"",
    "Aprovar ou reagendar pedidos de conversa",
  ]},
  { title: "Chat", items: ["Conversar com todo o Elo (líderes e crias)"] },
  { title: "Agenda", items: ["Ver eventos do Elo e exclusivos de liderança; confirmar presença"] },
  { title: "Perfil", items: ["Tema vermelho fixo de identidade, foto e dados próprios"] },
];

const CRIA_FEATURES: Feature[] = [
  { title: "Início", items: ["XP, posição no ranking, missões disponíveis e próximos eventos"] },
  { title: "Meu Elo", items: ["Ranking do time por XP"] },
  { title: "Missões", items: ["Ver disponíveis e enviar para aprovação do líder"] },
  { title: "Status diário", items: [
    "Responder como está emocional e espiritualmente (a cada 24h)",
    "Se responder \"Mal\": propor uma conversa (online/presencial) com o líder",
  ]},
  { title: "Chat", items: ["Conversar com o próprio Elo"] },
  { title: "Agenda", items: ["Ver eventos do Elo e confirmar presença"] },
  { title: "Perfil", items: ["Nome, foto e ficha opcional (contato de responsável, observações)"] },
];

function FeatureColumn({ title, tone, features }: { title: string; tone: string; features: Feature[] }) {
  return (
    <div>
      <h2 className={`mb-3 inline-block rounded-full px-3 py-1 text-sm font-bold ${tone}`}>{title}</h2>
      <div className="space-y-3">
        {features.map((f) => (
          <div key={f.title}>
            <p className="text-xs font-bold uppercase tracking-wide text-[var(--muted)]">{f.title}</p>
            <ul className="mt-1 space-y-1">
              {f.items.map((item) => (
                <li key={item} className="flex gap-1.5 text-sm">
                  <span className="text-emerald-600" aria-hidden>✓</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}

export default async function GeralPage() {
  await requireRole("admin");
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("admin_platform_health");
  const health = (data ?? null) as Health | null;

  const dbPct = health ? pct(health.db_size_bytes, DB_LIMIT_BYTES) : 0;
  const storagePct = health ? pct(health.storage_bytes, STORAGE_LIMIT_BYTES) : 0;
  const worst = Math.max(dbPct, storagePct);
  const healthTone =
    worst >= 80 ? "border-red-300 bg-red-50" : worst >= 50 ? "border-amber-300 bg-amber-50" : "";

  return (
    <>
      <PageHeader title="Geral" subtitle="Tudo que dá pra fazer na plataforma, e como ela está passando." />

      <section className="mb-6">
        <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-[var(--muted)]">
          Saúde da plataforma
        </h2>
        {error || !health ? (
          <Card>Não foi possível carregar os dados de saúde da plataforma agora.</Card>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            <Card className={healthTone}>
              <div className="flex items-center justify-between">
                <p className="text-sm font-bold">Banco de dados</p>
                <span className="text-xs text-[var(--muted)]">Postgres {health.postgres_version}</span>
              </div>
              <p className="mt-2 text-2xl font-black tabular-nums">
                {formatBytes(health.db_size_bytes)}{" "}
                <span className="text-sm font-normal text-[var(--muted)]">
                  de {formatBytes(DB_LIMIT_BYTES)} (plano Free)
                </span>
              </p>
              <div className="mt-2">
                <Bar value={health.db_size_bytes} total={DB_LIMIT_BYTES} />
              </div>
              <p className="mt-1 text-xs text-[var(--muted)]">{dbPct}% usado</p>
            </Card>

            <Card className={healthTone}>
              <div className="flex items-center justify-between">
                <p className="text-sm font-bold">Armazenamento de arquivos</p>
                <span className="text-xs text-[var(--muted)]">fotos de perfil, etc.</span>
              </div>
              <p className="mt-2 text-2xl font-black tabular-nums">
                {formatBytes(health.storage_bytes)}{" "}
                <span className="text-sm font-normal text-[var(--muted)]">
                  de {formatBytes(STORAGE_LIMIT_BYTES)} (plano Free)
                </span>
              </p>
              <div className="mt-2">
                <Bar value={health.storage_bytes} total={STORAGE_LIMIT_BYTES} />
              </div>
              <p className="mt-1 text-xs text-[var(--muted)]">{storagePct}% usado</p>
            </Card>

            <Card className="md:col-span-2">
              <p className="mb-2 text-sm font-bold">Volume de dados por área</p>
              <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-4">
                {Object.entries(health.counts).map(([key, value]) => (
                  <div key={key}>
                    <p className="text-xs text-[var(--muted)]">{COUNT_LABEL[key] ?? key}</p>
                    <p className="font-bold tabular-nums">{value.toLocaleString("pt-BR")}</p>
                  </div>
                ))}
              </div>
            </Card>

            <Card className="md:col-span-2">
              <p className="mb-2 text-sm font-bold">Hospedagem</p>
              <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
                <div>
                  <p className="text-xs text-[var(--muted)]">App</p>
                  <p className="font-semibold">elos-nine.vercel.app</p>
                </div>
                <div>
                  <p className="text-xs text-[var(--muted)]">Banco</p>
                  <p className="font-semibold">Supabase (sa-east-1)</p>
                </div>
                <div>
                  <p className="text-xs text-[var(--muted)]">Plano</p>
                  <p className="font-semibold">Free</p>
                </div>
                <div>
                  <p className="text-xs text-[var(--muted)]">Status</p>
                  <p className="font-semibold text-emerald-600">● Ativo</p>
                </div>
              </div>
              {worst >= 50 ? (
                <p className="mt-3 rounded-xl bg-amber-100 px-3 py-2 text-xs text-amber-900">
                  Um dos limites do plano Free já passou de 50%. Vale acompanhar e considerar
                  upgrade de plano antes de chegar perto de 100%.
                </p>
              ) : (
                <p className="mt-3 text-xs text-[var(--muted)]">
                  Tudo dentro dos limites do plano Free por enquanto.
                </p>
              )}
            </Card>
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-[var(--muted)]">
          Tudo que é possível fazer na plataforma
        </h2>
        <Card>
          <div className="grid gap-6 md:grid-cols-3">
            <FeatureColumn
              title="Admin"
              tone="bg-[var(--accent-soft)] text-[var(--accent-strong)]"
              features={ADMIN_FEATURES}
            />
            <FeatureColumn
              title="Líder"
              tone="bg-red-100 text-red-700"
              features={LEADER_FEATURES}
            />
            <FeatureColumn
              title="Cria"
              tone="bg-amber-100 text-amber-800"
              features={CRIA_FEATURES}
            />
          </div>
        </Card>
      </section>
    </>
  );
}
