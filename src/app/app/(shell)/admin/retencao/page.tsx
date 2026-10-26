import { Card, EmptyState, PageHeader } from "@/components/ui";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

type Report = {
  today: string;
  members: number;
  dau: { day: string; users: number }[];
  dau_today: number;
  dau_yesterday: number;
  avg_dau_7: number;
  avg_dau_prev7: number;
  wau: number;
  wau_prev: number;
  mau: number;
  weekday: { dow: number; avg: number }[];
  segments: { ativo: number; em_risco: number; dormente: number; perdido: number };
  at_risk: { id: string; name: string; role: string; elo: string | null; days: number | null; bucket: string }[];
  retention: { day: number; eligible: number; returned: number }[];
  cohorts: { week: string; size: number; pct: number[] }[];
  groups: { engaged: number; casual: number; none: number };
  features: { name: string; users: number; engaged: number; casual: number }[];
  games: { game: string; users: number }[];
  elos: { name: string; members: number; active7: number }[];
};

const GAME_NAME: Record<string, string> = {
  arena: "Arena dos Heróis",
  quiz: "Quiz",
  who: "Quem sou eu?",
  verse: "Versículo",
  quemdesenha: "Quem Desenha?",
  dress: "Vista o Herói",
  order: "Ordem",
  memory: "Memória dos Heróis",
  duel: "Duelos",
  collection: "Coleção",
  madureira: "Shopping Elos",
  minearena: "MineArena",
  ultimatribo: "A Última Tribo",
  missao: "Missão Madureira",
  english: "Babel",
  tribos: "Clash of Tribos",
  arenasoccer: "ArenaSoccer",
  biblerush: "Bible Rush",
  arenacampanha: "Campanha da Arena",
};
const DOW = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

const pct = (a: number, b: number) => (b > 0 ? Math.round((100 * a) / b) : 0);
const dm = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;

function Delta({ now, before, unit = "" }: { now: number; before: number; unit?: string }) {
  const d = Math.round((now - before) * 10) / 10;
  if (d === 0) return <span className="text-xs text-[var(--muted)]">igual à semana anterior</span>;
  return (
    <span className={`text-xs font-bold ${d > 0 ? "text-emerald-500" : "text-rose-500"}`}>
      {d > 0 ? "▲" : "▼"} {Math.abs(d)}
      {unit} vs. semana anterior
    </span>
  );
}

function Kpi({ label, value, sub, hint }: { label: string; value: React.ReactNode; sub?: React.ReactNode; hint?: string }) {
  return (
    <Card className="p-4">
      <p className="text-xs font-bold uppercase tracking-wide text-[var(--muted)]">{label}</p>
      <p className="mt-1 text-3xl font-black tabular-nums leading-none">{value}</p>
      <div className="mt-1.5 min-h-4">{sub}</div>
      {hint ? <p className="mt-1 text-[11px] text-[var(--muted)]">{hint}</p> : null}
    </Card>
  );
}

function Bar({ value, max, label, right, tone = "accent" }: { value: number; max: number; label: React.ReactNode; right?: React.ReactNode; tone?: "accent" | "good" | "warn" }) {
  const w = max > 0 ? Math.max(2, Math.round((100 * value) / max)) : 0;
  const color = tone === "good" ? "bg-emerald-500" : tone === "warn" ? "bg-amber-500" : "bg-[var(--accent)]";
  return (
    <div className="flex items-center gap-3 text-sm">
      <span className="w-36 shrink-0 truncate font-semibold">{label}</span>
      <div className="h-3 min-w-0 flex-1 overflow-hidden rounded-full bg-[var(--line)]">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${w}%` }} />
      </div>
      <span className="w-20 shrink-0 text-right text-xs font-bold tabular-nums text-[var(--muted)]">{right ?? value}</span>
    </div>
  );
}

function DauChart({ data, today }: { data: { day: string; users: number }[]; today: string }) {
  const max = Math.max(1, ...data.map((d) => d.users));
  const W = 640;
  const H = 150;
  const bw = W / data.length;
  const avg = data.slice(0, -1).reduce((s, d) => s + d.users, 0) / Math.max(1, data.length - 1);
  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H + 22}`} className="w-full" role="img" aria-label="Pessoas ativas por dia nos últimos 30 dias">
        <line x1="0" x2={W} y1={H - (avg / max) * H} y2={H - (avg / max) * H} stroke="currentColor" strokeOpacity="0.35" strokeDasharray="4 4" />
        {data.map((d, i) => {
          const h = (d.users / max) * H;
          const isToday = d.day === today;
          return (
            <g key={d.day}>
              <rect x={i * bw + 2} y={H - h} width={bw - 4} height={h} rx="3" fill="var(--accent)" opacity={isToday ? 0.45 : 1}>
                <title>{`${dm(d.day)}: ${d.users} pessoas${isToday ? " (dia em andamento)" : ""}`}</title>
              </rect>
              {i % 5 === 0 || i === data.length - 1 ? (
                <text x={i * bw + bw / 2} y={H + 15} textAnchor="middle" fontSize="10" fill="currentColor" opacity="0.6">
                  {dm(d.day)}
                </text>
              ) : null}
            </g>
          );
        })}
      </svg>
      <p className="mt-1 text-[11px] text-[var(--muted)]">Linha tracejada: média dos dias fechados ({Math.round(avg)} pessoas). A última barra (clara) é o dia de hoje, ainda em andamento.</p>
    </div>
  );
}

function heat(p: number): string {
  // intensidade da cor pela retenção
  return `color-mix(in srgb, var(--accent) ${Math.round(Math.min(100, p) * 0.85)}%, transparent)`;
}

export default async function RetentionPage() {
  await requireRole("admin");
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_retention_report");
  const r = data as Report | null;

  if (error || !r) {
    return (
      <>
        <PageHeader title="📈 Retenção" subtitle="Quem abre o app, quem volta e quem está sumindo." />
        <EmptyState>Não foi possível carregar o relatório agora.</EmptyState>
      </>
    );
  }

  const seg = r.segments;
  const maxDow = Math.max(1, ...r.weekday.map((w) => w.avg));
  const maxGame = Math.max(1, ...r.games.map((g) => g.users));
  const eng = Math.max(1, r.groups.engaged);
  const cas = Math.max(1, r.groups.casual);
  const stick = pct(r.avg_dau_7, r.mau);

  // leitura rápida (frases geradas a partir dos números)
  const notes: string[] = [];
  const wauNow = pct(r.wau, r.members);
  notes.push(`${r.wau} de ${r.members} pessoas (${wauNow}%) abriram o app nesta semana.`);
  if (r.avg_dau_prev7 > 0) {
    const ch = Math.round(((r.avg_dau_7 - r.avg_dau_prev7) / r.avg_dau_prev7) * 100);
    notes.push(ch === 0 ? "A média diária ficou igual à da semana anterior." : `A média diária ${ch > 0 ? "subiu" : "caiu"} ${Math.abs(ch)}% em relação à semana anterior.`);
  }
  notes.push(`De cada 100 pessoas que usam o app no mês, ${stick} abrem num dia comum (fidelidade).`);
  const lift = r.features
    .map((f) => ({ name: f.name, diff: pct(f.engaged, eng) - pct(f.casual, cas) }))
    .sort((a, b) => b.diff - a.diff)[0];
  if (lift && lift.diff > 10) notes.push(`O que mais separa quem abre quase todo dia de quem abre pouco: “${lift.name}” (+${lift.diff} pontos percentuais entre os mais engajados).`);
  const needHelp = seg.em_risco + seg.dormente;
  if (needHelp > 0) notes.push(`${needHelp} pessoa${needHelp === 1 ? "" : "s"} em risco ou dormindo: vale um chamado do líder.`);

  const lists: [string, string, string][] = [
    ["em_risco", "Em risco (3 a 6 dias sem abrir)", "text-amber-500"],
    ["dormente", "Dormindo (7 a 13 dias)", "text-orange-500"],
    ["perdido", "Perdidos (14 dias ou mais)", "text-rose-500"],
  ];

  return (
    <>
      <PageHeader
        title="📈 Retenção"
        subtitle="Quem abre o app, quem volta e quem está sumindo. Conta como “abriu” a pessoa que fez algo no dia (check-in, jogo, post, devocional, mensagem…) e, de hoje em diante, também o sinal de vida do app."
      />

      <Card className="mb-4 p-4">
        <p className="mb-2 text-sm font-black">🧠 Leitura rápida</p>
        <ul className="space-y-1 text-sm">
          {notes.map((n) => (
            <li key={n}>• {n}</li>
          ))}
        </ul>
      </Card>

      <section className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Kpi label="Ativos hoje" value={r.dau_today} sub={<span className="text-xs text-[var(--muted)]">ontem: {r.dau_yesterday}</span>} hint="O dia ainda está em andamento." />
        <Kpi label="Média diária (7 dias)" value={r.avg_dau_7} sub={<Delta now={r.avg_dau_7} before={r.avg_dau_prev7} />} />
        <Kpi label="Ativos na semana" value={r.wau} sub={<Delta now={r.wau} before={r.wau_prev} />} hint={`${wauNow}% dos ${r.members} membros`} />
        <Kpi label="Ativos no mês" value={r.mau} sub={<span className="text-xs text-[var(--muted)]">fidelidade: {stick}%</span>} hint="Fidelidade = média diária ÷ ativos no mês." />
      </section>

      <Card className="mb-4 p-4">
        <p className="mb-2 text-sm font-black">Pessoas ativas por dia (últimos 30 dias)</p>
        <DauChart data={r.dau} today={r.today} />
      </Card>

      <section className="mb-4 grid gap-4 md:grid-cols-2">
        <Card className="p-4">
          <p className="text-sm font-black">Quem volta depois de entrar</p>
          <p className="mb-3 text-[11px] text-[var(--muted)]">% que abriu o app exatamente N dias depois de criar a conta.</p>
          <div className="space-y-2">
            {r.retention.map((x) => (
              <Bar key={x.day} label={`Dia ${x.day}`} value={pct(x.returned, x.eligible)} max={100} right={`${pct(x.returned, x.eligible)}% (${x.returned}/${x.eligible})`} tone={pct(x.returned, x.eligible) >= 50 ? "good" : "warn"} />
            ))}
          </div>
        </Card>

        <Card className="p-4">
          <p className="text-sm font-black">Como estão as pessoas agora</p>
          <p className="mb-3 text-[11px] text-[var(--muted)]">Pela última vez que abriram o app.</p>
          <div className="space-y-2">
            <Bar label="Ativas (até 2 dias)" value={seg.ativo} max={r.members} tone="good" right={`${seg.ativo} (${pct(seg.ativo, r.members)}%)`} />
            <Bar label="Em risco (3–6 dias)" value={seg.em_risco} max={r.members} tone="warn" right={`${seg.em_risco} (${pct(seg.em_risco, r.members)}%)`} />
            <Bar label="Dormindo (7–13 dias)" value={seg.dormente} max={r.members} tone="warn" right={`${seg.dormente} (${pct(seg.dormente, r.members)}%)`} />
            <Bar label="Perdidas (14+ dias)" value={seg.perdido} max={r.members} tone="warn" right={`${seg.perdido} (${pct(seg.perdido, r.members)}%)`} />
          </div>
        </Card>
      </section>

      <Card className="mb-4 p-4">
        <p className="text-sm font-black">Retenção por semana de entrada</p>
        <p className="mb-3 text-[11px] text-[var(--muted)]">Cada linha é o grupo que entrou naquela semana. As colunas mostram a % do grupo que abriu o app em cada semana depois. Quanto mais forte a cor, melhor.</p>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[420px] border-separate border-spacing-1 text-center text-xs">
            <thead>
              <tr className="text-[var(--muted)]">
                <th className="text-left font-bold">Entrada</th>
                <th className="font-bold">Pessoas</th>
                {[0, 1, 2, 3, 4, 5].map((k) => (
                  <th key={k} className="font-bold">
                    Sem. {k}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {r.cohorts.map((c) => (
                <tr key={c.week}>
                  <td className="text-left font-bold">{dm(c.week)}</td>
                  <td className="tabular-nums">{c.size}</td>
                  {[0, 1, 2, 3, 4, 5].map((k) => (
                    <td key={k} className="rounded-md py-1.5 font-bold tabular-nums" style={c.pct[k] === undefined ? undefined : { background: heat(c.pct[k]) }}>
                      {c.pct[k] === undefined ? "" : `${c.pct[k]}%`}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-[11px] text-[var(--muted)]">Grupos pequenos (1 a 4 pessoas) oscilam muito: olhe os maiores.</p>
      </Card>

      <section className="mb-4 grid gap-4 md:grid-cols-2">
        <Card className="p-4">
          <p className="text-sm font-black">O que os mais engajados fazem</p>
          <p className="mb-3 text-[11px] text-[var(--muted)]">
            Últimos 7 dias. Engajados = abriram o app em 4 dias ou mais ({r.groups.engaged} pessoas); casuais = 1 a 3 dias ({r.groups.casual}); sumidos = nenhum ({r.groups.none}). Cada linha mostra a % de cada grupo que usou o recurso.
          </p>
          <div className="space-y-3">
            {r.features.map((f) => (
              <div key={f.name}>
                <p className="mb-1 flex justify-between text-sm font-semibold">
                  <span>{f.name}</span>
                  <span className="text-xs text-[var(--muted)]">{f.users} pessoas</span>
                </p>
                <Bar label="Engajados" value={pct(f.engaged, eng)} max={100} right={`${pct(f.engaged, eng)}%`} tone="good" />
                <Bar label="Casuais" value={pct(f.casual, cas)} max={100} right={`${pct(f.casual, cas)}%`} />
              </div>
            ))}
          </div>
        </Card>

        <div className="space-y-4">
          <Card className="p-4">
            <p className="text-sm font-black">Jogos: pessoas diferentes (7 dias)</p>
            <div className="mt-3 space-y-2">
              {r.games.map((g) => (
                <Bar key={g.game} label={GAME_NAME[g.game] ?? g.game} value={g.users} max={maxGame} />
              ))}
            </div>
          </Card>
          <Card className="p-4">
            <p className="text-sm font-black">Dia da semana</p>
            <p className="mb-3 text-[11px] text-[var(--muted)]">Média de pessoas ativas por dia nas últimas 4 semanas.</p>
            <div className="space-y-2">
              {r.weekday.map((w) => (
                <Bar key={w.dow} label={DOW[w.dow]} value={w.avg} max={maxDow} right={String(w.avg)} />
              ))}
            </div>
          </Card>
        </div>
      </section>

      <Card className="mb-4 p-4">
        <p className="text-sm font-black">Ativas na semana, por Elo</p>
        <div className="mt-3 space-y-2">
          {r.elos.map((e) => (
            <Bar key={e.name} label={e.name} value={pct(e.active7, e.members)} max={100} right={`${e.active7}/${e.members} (${pct(e.active7, e.members)}%)`} tone={pct(e.active7, e.members) >= 75 ? "good" : "warn"} />
          ))}
        </div>
      </Card>

      <Card className="mb-8 p-4">
        <p className="text-sm font-black">Quem precisa de atenção</p>
        <p className="mb-3 text-[11px] text-[var(--muted)]">Os mais recentes primeiro (são os mais fáceis de trazer de volta). Mostra até 60 pessoas.</p>
        {r.at_risk.length === 0 ? (
          <p className="text-sm text-[var(--muted)]">Ninguém em risco agora. 🎉</p>
        ) : (
          lists.map(([bucket, title, color]) => {
            const rows = r.at_risk.filter((x) => x.bucket === bucket);
            if (!rows.length) return null;
            return (
              <div key={bucket} className="mb-4 last:mb-0">
                <p className={`mb-1 text-xs font-black uppercase tracking-wide ${color}`}>
                  {title} · {rows.length}
                </p>
                <ul className="divide-y divide-[var(--line)] rounded-xl border border-[var(--line)]">
                  {rows.map((x) => (
                    <li key={x.id} className="flex items-center gap-2 px-3 py-2 text-sm">
                      <span className="min-w-0 flex-1 truncate font-semibold">{x.name}</span>
                      <span className="hidden shrink-0 text-xs text-[var(--muted)] sm:inline">{x.role === "leader" ? "Líder" : "Cria"} · {x.elo ?? "sem Elo"}</span>
                      <span className="shrink-0 text-xs font-bold tabular-nums text-[var(--muted)]">{x.days === null ? "nunca abriu" : `há ${x.days} dias`}</span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })
        )}
      </Card>
    </>
  );
}
