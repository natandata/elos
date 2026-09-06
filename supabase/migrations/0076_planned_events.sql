-- Planejamento de Eventos ("Eventos"): área de bastidor pro admin organizar
-- um culto/evento antes dele existir na Agenda pública — liturgia, lembretes
-- de solicitações, convidados possíveis e repertório musical. Admin edita,
-- qualquer líder aprovado só visualiza.

create table public.planned_events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  event_date date not null,
  event_time time,
  location text,
  elo_id uuid references public.elos(id) on delete set null,
  leaders_only boolean not null default false,
  linked_event_id uuid references public.events(id) on delete set null,
  created_by uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index planned_events_date_idx on public.planned_events(event_date);
create trigger trg_touch_planned_events before update on public.planned_events
  for each row execute function public.touch_updated_at();

create table public.planned_event_liturgy_items (
  id uuid primary key default gen_random_uuid(),
  planned_event_id uuid not null references public.planned_events(id) on delete cascade,
  position int not null default 0,
  time text,
  title text not null,
  responsible text,
  notes text,
  created_at timestamptz not null default now()
);
create index planned_event_liturgy_items_event_idx on public.planned_event_liturgy_items(planned_event_id, position);

create table public.planned_event_reminders (
  id uuid primary key default gen_random_uuid(),
  planned_event_id uuid not null references public.planned_events(id) on delete cascade,
  title text not null,
  done boolean not null default false,
  remind_at date,
  created_at timestamptz not null default now()
);
create index planned_event_reminders_event_idx on public.planned_event_reminders(planned_event_id);

create table public.planned_event_guests (
  id uuid primary key default gen_random_uuid(),
  planned_event_id uuid not null references public.planned_events(id) on delete cascade,
  name text not null,
  role_or_reason text,
  contact text,
  status text not null default 'suggested' check (status in ('suggested', 'invited', 'confirmed', 'declined')),
  notes text,
  created_at timestamptz not null default now()
);
create index planned_event_guests_event_idx on public.planned_event_guests(planned_event_id);

create table public.planned_event_setlist (
  id uuid primary key default gen_random_uuid(),
  planned_event_id uuid not null references public.planned_events(id) on delete cascade,
  position int not null default 0,
  song_title text not null,
  link text,
  notes text,
  created_at timestamptz not null default now()
);
create index planned_event_setlist_event_idx on public.planned_event_setlist(planned_event_id, position);

-- RLS: admin faz tudo; líder aprovado só lê.
alter table public.planned_events enable row level security;
alter table public.planned_event_liturgy_items enable row level security;
alter table public.planned_event_reminders enable row level security;
alter table public.planned_event_guests enable row level security;
alter table public.planned_event_setlist enable row level security;

create policy planned_events_read on public.planned_events for select to authenticated using (
  public.is_admin() or (public.is_approved() and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'leader'))
);
create policy planned_events_write on public.planned_events for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy planned_event_liturgy_items_read on public.planned_event_liturgy_items for select to authenticated using (
  public.is_admin() or (public.is_approved() and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'leader'))
);
create policy planned_event_liturgy_items_write on public.planned_event_liturgy_items for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy planned_event_reminders_read on public.planned_event_reminders for select to authenticated using (
  public.is_admin() or (public.is_approved() and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'leader'))
);
create policy planned_event_reminders_write on public.planned_event_reminders for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy planned_event_guests_read on public.planned_event_guests for select to authenticated using (
  public.is_admin() or (public.is_approved() and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'leader'))
);
create policy planned_event_guests_write on public.planned_event_guests for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy planned_event_setlist_read on public.planned_event_setlist for select to authenticated using (
  public.is_admin() or (public.is_approved() and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'leader'))
);
create policy planned_event_setlist_write on public.planned_event_setlist for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
