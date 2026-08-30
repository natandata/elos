export type Role = "admin" | "leader" | "cria" | "guardian";
export type Gender = "male" | "female";
export type AgeRange = "12-14" | "15-16" | "17";
export type StatusLevel = "bad" | "ok" | "good";
export type MissionType = "individual" | "collective";
export type AssignmentStatus = "pending" | "awaiting_approval" | "approved" | "rejected";

export type Elo = {
  id: string;
  name: string;
  gender: Gender;
  age_range: AgeRange;
};

export type Profile = {
  id: string;
  full_name: string;
  first_name: string | null;
  last_name: string | null;
  username: string | null;
  bio: string | null;
  age_range: AgeRange | null;
  gender: Gender | null;
  role: Role;
  approved: boolean;
  show_other_leader_missions: boolean;
  elo_id: string | null;
  avatar_url: string | null;
  xp: number;
  chat_last_read_at: string | null;
  guardian_ack_at: string | null;
  email_opt_in: boolean;
  status_streak: number;
  status_streak_date: string | null;
  last_login_bonus_on: string | null;
  onboarding_completed_at: string | null;
  created_at: string;
  updated_at: string;
};

export type Achievement = {
  key: string;
  title: string;
  description: string;
  icon: string;
};

/** Níveis por XP acumulado — puramente de exibição, sem afetar nenhuma regra de negócio. */
export const XP_LEVELS: { min: number; title: string }[] = [
  { min: 0, title: "Aprendiz" },
  { min: 50, title: "Discípulo" },
  { min: 150, title: "Servo" },
  { min: 300, title: "Mentor" },
  { min: 600, title: "Referência" },
];

export function levelForXp(xp: number): { title: string; next: number | null } {
  let current = XP_LEVELS[0];
  let next: number | null = null;
  for (let i = 0; i < XP_LEVELS.length; i++) {
    if (xp >= XP_LEVELS[i].min) current = XP_LEVELS[i];
    else {
      next = XP_LEVELS[i].min;
      break;
    }
  }
  return { title: current.title, next };
}

export type CareMeetingStatus = "pending_leader" | "pending_cria" | "confirmed" | "cancelled";
export type CareMeetingModality = "online" | "presencial";

export type CareMeeting = {
  id: string;
  cria_id: string;
  elo_id: string | null;
  status_response_id: string | null;
  modality: CareMeetingModality;
  proposed_date: string;
  proposed_time: string | null;
  note: string | null;
  status: CareMeetingStatus;
  proposed_by: "cria" | "leader";
  created_at: string;
  updated_at: string;
};

export type CriaProfileDetails = {
  id: string;
  guardian_name: string | null;
  guardian_phone: string | null;
  guardian_relationship: string | null;
  notes: string | null;
  updated_at: string;
};

export type Mission = {
  id: string;
  created_by: string;
  title: string;
  description: string | null;
  type: MissionType;
  xp: number;
  start_date: string | null;
  due_date: string | null;
  elo_id: string | null;
  publish_at: string | null;
  created_at: string;
};

export type MissionAssignment = {
  id: string;
  mission_id: string;
  cria_id: string;
  status: AssignmentStatus;
  submitted_at: string | null;
  approved_at: string | null;
  approved_by: string | null;
  rejection_reason: string | null;
  created_at: string;
};

export type EloEvent = {
  id: string;
  title: string;
  description: string | null;
  event_date: string;
  event_time: string | null;
  location: string | null;
  elo_id: string | null;
  leaders_only: boolean;
};

export type StatusResponse = {
  id: string;
  user_id: string;
  emotional_status: StatusLevel;
  spiritual_status: StatusLevel;
  created_at: string;
};

export type ChatMessage = {
  id: string;
  elo_id: string;
  sender_id: string;
  body: string;
  created_at: string;
};

// ---------------------------------------------------------------- rótulos PT-BR

export const AGE_RANGE_LABEL: Record<AgeRange, string> = {
  "12-14": "12–14 anos",
  "15-16": "15–16 anos",
  "17": "17 anos",
};

export const GENDER_LABEL: Record<Gender, string> = {
  male: "Masculino",
  female: "Feminino",
};

export const ROLE_LABEL: Record<Role, string> = {
  admin: "Admin",
  leader: "Líder",
  cria: "Cria",
  guardian: "Responsável",
};

export const STATUS_LABEL: Record<StatusLevel, string> = {
  bad: "Mal",
  ok: "Mais ou menos",
  good: "Bem",
};

export const STATUS_TONE: Record<StatusLevel, string> = {
  // "Mal" precisa saltar aos olhos do líder — os outros dois são só informativos.
  bad: "border-red-600 bg-red-600 text-white font-bold",
  ok: "bg-amber-100 text-amber-800 border-amber-200",
  good: "bg-emerald-100 text-emerald-700 border-emerald-200",
};

/** true se alguma das duas respostas de status for "Mal" — sinal de alerta pro líder. */
export function hasBadStatus(s: { emotional_status: StatusLevel; spiritual_status: StatusLevel } | undefined | null): boolean {
  return !!s && (s.emotional_status === "bad" || s.spiritual_status === "bad");
}

/** true se alguma das duas respostas for diferente de "Bem" — inclui "Mal" e "Mais ou menos". */
export function hasConcerningStatus(s: { emotional_status: StatusLevel; spiritual_status: StatusLevel } | undefined | null): boolean {
  return !!s && (s.emotional_status !== "good" || s.spiritual_status !== "good");
}

export const ASSIGNMENT_LABEL: Record<AssignmentStatus, string> = {
  pending: "Disponível",
  awaiting_approval: "Aguardando aprovação",
  approved: "Aprovada",
  rejected: "Recusada",
};

export const ASSIGNMENT_TONE: Record<AssignmentStatus, string> = {
  pending: "bg-slate-100 text-slate-700 border-slate-200",
  awaiting_approval: "bg-amber-100 text-amber-800 border-amber-200",
  approved: "bg-emerald-100 text-emerald-700 border-emerald-200",
  rejected: "bg-red-100 text-red-700 border-red-200",
};

export const MISSION_TYPE_LABEL: Record<MissionType, string> = {
  individual: "Individual",
  collective: "Coletiva",
};

export function formatDate(value: string | null): string {
  if (!value) return "—";
  const [y, m, d] = value.slice(0, 10).split("-");
  return `${d}/${m}/${y}`;
}

export function formatDateTime(value: string | null): string {
  if (!value) return "—";
  // Server roda em UTC (Vercel) — sem fixar o fuso, a hora sai errada pra
  // quem está no Brasil (aparecia ~3h adiantada).
  return new Date(value).toLocaleString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function relativeDay(value: string | null): string {
  if (!value) return "Nunca";
  // Mesmo truque do horário: desloca pro fuso de Brasília antes de extrair
  // ano/mês/dia, já que o server (Vercel) roda em UTC.
  const BR_OFFSET_MS = 3 * 3_600_000;
  const then = new Date(new Date(value).getTime() - BR_OFFSET_MS);
  const today = new Date(Date.now() - BR_OFFSET_MS);
  const days = Math.floor(
    (new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime() -
      new Date(then.getFullYear(), then.getMonth(), then.getDate()).getTime()) /
      86_400_000,
  );
  if (days <= 0) return "Hoje";
  if (days === 1) return "Ontem";
  if (days < 7) return `${days} dias atrás`;
  return formatDate(value);
}

export function formatXp(xp: number): string {
  return xp.toLocaleString("pt-BR");
}

// ---------------------------------------------------------------- nível/XP

/** XP necessário pra completar um nível. Todo mundo (líder e cria) começa no nível 0. */
export const XP_PER_LEVEL = 100;

/** XP máximo que uma única missão pode conceder. */
export const MAX_MISSION_XP = 25;

export function levelFromXp(xp: number): { level: number; progress: number; pct: number } {
  const safeXp = Math.max(0, xp);
  const level = Math.floor(safeXp / XP_PER_LEVEL);
  const progress = safeXp % XP_PER_LEVEL;
  return { level, progress, pct: (progress / XP_PER_LEVEL) * 100 };
}
