-- Vista o Herói no formato do Dress to Impress (aplicada via MCP):
-- camarim com relógio (dress_camarim), look com avatar personalizada (beauty, elapsed),
-- nota de 1 a 5 estrelas (dress_runway_votes.stars) e fechamento do dia pela maior média de estrelas.
alter table public.dress_runway_looks add column if not exists beauty jsonb, add column if not exists elapsed integer;
alter table public.dress_runway_votes add column if not exists stars smallint not null default 5;
alter table public.dress_runway_votes drop constraint if exists dress_runway_votes_stars_check;
alter table public.dress_runway_votes add constraint dress_runway_votes_stars_check check (stars between 1 and 5);

create table if not exists public.dress_camarim (
  user_id uuid not null references public.profiles(id) on delete cascade,
  play_date date not null,
  started_at timestamptz not null default now(),
  primary key (user_id, play_date)
);
alter table public.dress_camarim enable row level security;

-- dress_runway_settle: o pódio sai da maior média de estrelas (empate: mais notas, mais fiel, mais cedo).
-- (corpo completo aplicado no banco; ver a função public.dress_runway_settle)
