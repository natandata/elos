-- Pesquisa única para o Elo Masculino 16–17: "Você gostaria de ser mais generoso?"
-- Quem responde Sim compartilha 3 XP do próprio Elo com cada um dos outros 5 Elos (15 XP doados no total).
-- Quem responde Não: nada acontece. A pergunta só é feita uma vez por pessoa.
create table if not exists public.elo_surveys (
  user_id uuid not null references public.profiles(id) on delete cascade,
  survey text not null,
  answer text not null,
  elo_id uuid references public.elos(id) on delete set null,
  xp_moved integer not null default 0,
  created_at timestamptz not null default now(),
  primary key (user_id, survey)
);
alter table public.elo_surveys enable row level security;
drop policy if exists elo_surveys_read on public.elo_surveys;
create policy elo_surveys_read on public.elo_surveys for select using (user_id = auth.uid() or public.is_admin());

create or replace function public.survey_generosity_answer(p_yes boolean)
returns jsonb
language plpgsql security definer set search_path = public as $fn$
declare
  uid uuid := auth.uid();
  me public.profiles%rowtype;
  mine public.elos%rowtype;
  others int;
  moved int := 0;
begin
  if uid is null then return jsonb_build_object('error', 'Entre na sua conta.'); end if;
  select * into me from public.profiles where id = uid;
  if me.role is distinct from 'cria' or me.elo_id is null then return jsonb_build_object('error', 'Pesquisa indisponível.'); end if;
  select * into mine from public.elos where id = me.elo_id;
  if mine.gender is distinct from 'male' or mine.age_range is distinct from '16-17' then
    return jsonb_build_object('error', 'Pesquisa indisponível.');
  end if;
  if exists (select 1 from public.elo_surveys where user_id = uid and survey = 'generosidade') then
    return jsonb_build_object('error', 'Você já respondeu.');
  end if;

  if p_yes then
    select count(*) into others from public.elos where id <> mine.id;
    moved := others * 3;
    update public.elos set bonus_xp = bonus_xp - moved where id = mine.id;
    update public.elos set bonus_xp = bonus_xp + 3 where id <> mine.id;
  end if;
  insert into public.elo_surveys (user_id, survey, answer, elo_id, xp_moved)
  values (uid, 'generosidade', case when p_yes then 'sim' else 'nao' end, mine.id, moved);
  return jsonb_build_object('ok', true, 'moved', moved);
end;
$fn$;
revoke execute on function public.survey_generosity_answer(boolean) from anon, public;
grant execute on function public.survey_generosity_answer(boolean) to authenticated;
