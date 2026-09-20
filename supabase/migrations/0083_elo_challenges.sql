-- Desafio entre Elos: o admin propõe uma disputa (ex.: "Elo que mais
-- confirmar presença no próximo evento ganha 50 XP pra todo mundo"), todo
-- mundo vê enquanto está em aberto, e quando o admin declara o vencedor o
-- bônus é creditado pra cada cria do Elo vencedor de uma vez.
create table if not exists public.elo_challenges (
  id            uuid primary key default gen_random_uuid(),
  title         text not null,
  description   text,
  bonus_xp      integer not null default 0 check (bonus_xp >= 0),
  status        text not null default 'open' check (status in ('open', 'finished')),
  winner_elo_id uuid references public.elos(id) on delete set null,
  created_by    uuid references public.profiles(id) on delete set null,
  created_at    timestamptz not null default now(),
  finished_at   timestamptz
);
create index if not exists elo_challenges_status_idx on public.elo_challenges(status);
alter table public.elo_challenges enable row level security;

drop policy if exists elo_challenges_read on public.elo_challenges;
create policy elo_challenges_read on public.elo_challenges for select to authenticated using (true);

drop policy if exists elo_challenges_admin on public.elo_challenges;
create policy elo_challenges_admin on public.elo_challenges for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- Credita o bônus pra cada cria do Elo vencedor de uma vez só — soma, não
-- substitui (cada um mantém o XP que já tinha, só ganha o extra por cima).
create or replace function public.award_elo_challenge_bonus(p_elo_id uuid, p_amount int)
returns void language plpgsql security definer set search_path = public as $fn$
begin
  if not public.is_admin() then
    raise exception 'Apenas a administração pode premiar um desafio';
  end if;
  if p_amount <= 0 then return; end if;

  update public.profiles set xp = xp + p_amount where elo_id = p_elo_id and role = 'cria';
end $fn$;

revoke execute on function public.award_elo_challenge_bonus(uuid, int) from anon, public;
grant  execute on function public.award_elo_challenge_bonus(uuid, int) to authenticated;
