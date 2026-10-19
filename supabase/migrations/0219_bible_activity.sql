-- ELOS — a leitura da Bíblia aparece na "Atividade recente" do admin (últimas 24h):
--   · "Leu a Bíblia · João 3 · 2 min 15 s hoje" (ou "Abriu a Bíblia" nos primeiros 30 s), no horário do último aviso;
--   · "Completou a leitura do dia" (+1 XP; para o cria, "liberou a Sala de Jogos"), no horário em que fechou os 5 min.
-- Sem escrita extra: as linhas saem de bible_reading_daily. Para saber QUAL passagem, a tela da Bíblia manda a referência
-- aberta (p_ref, só texto curto e limpo) e a função guarda a última em last_ref.

alter table public.bible_reading_daily add column if not exists last_ref text;

drop function if exists public.record_bible_reading(boolean);

create or replace function public.record_bible_reading(p_resume boolean default false, p_ref text default null)
returns jsonb language plpgsql security definer set search_path = public as $fn$
declare
  v_day date := (now() at time zone 'America/Sao_Paulo')::date;
  v_need constant int := 300;
  v_role text;
  v_row public.bible_reading_daily;
  v_gap numeric;
  v_add int := 0;
  v_total int;
  v_xp int := 0;
  v_ref text := nullif(left(regexp_replace(coalesce(p_ref, ''), '[^[:alnum:] .]', '', 'g'), 40), '');
begin
  select role into v_role from public.profiles where id = auth.uid();
  if v_role is null or v_role not in ('cria', 'leader') then
    return jsonb_build_object('seconds', v_need, 'required', v_need, 'unlocked', true, 'xp', 0);
  end if;

  insert into public.bible_reading_daily (user_id, day) values (auth.uid(), v_day) on conflict do nothing;
  select * into v_row from public.bible_reading_daily where user_id = auth.uid() and day = v_day for update;

  if v_row.unlocked_at is not null then
    return jsonb_build_object('seconds', v_row.seconds, 'required', v_need, 'unlocked', true, 'xp', 0);
  end if;

  if not coalesce(p_resume, false) and v_row.last_ping is not null then
    v_gap := extract(epoch from (now() - v_row.last_ping));
    if v_gap >= 1 and v_gap <= 40 then v_add := round(least(v_gap, 20))::int; end if;
  end if;
  v_total := v_row.seconds + v_add;

  update public.bible_reading_daily
     set seconds = v_total,
         last_ping = now(),
         last_ref = coalesce(v_ref, last_ref),
         unlocked_at = case when v_total >= v_need then now() else null end
   where user_id = auth.uid() and day = v_day;

  if v_total >= v_need then
    perform public.game_grant_xp(auth.uid(), 1, 'bible_reading');
    v_xp := 1;
  end if;

  return jsonb_build_object('seconds', v_total, 'required', v_need, 'unlocked', v_total >= v_need, 'xp', v_xp);
end $fn$;
revoke execute on function public.record_bible_reading(boolean, text) from anon, public;
grant execute on function public.record_bible_reading(boolean, text) to authenticated;

create or replace function public.admin_recent_bible_activity(p_exclude_user uuid default null, p_limit int default 300)
returns table(actor_id uuid, actor_name text, actor_role text, action text, detail text, created_at timestamptz)
language plpgsql stable security definer set search_path = public as $fn$
begin
  if not public.is_admin() then
    raise exception 'Sem permissão.';
  end if;
  return query
  select x.actor_id, x.actor_name, x.actor_role, x.action, x.detail, x.created_at
  from (
    select p.id as actor_id, p.full_name as actor_name, p.role::text as actor_role, 'bible_reading'::text as action,
           case when b.seconds < 30 then 'Abriu a Bíblia' else 'Leu a Bíblia' end
           || coalesce(' · ' || b.last_ref, '')
           || case when b.seconds >= 30 then ' · ' || (b.seconds / 60)::text || ' min ' || lpad((b.seconds % 60)::text, 2, '0') || ' s hoje' else '' end as detail,
           b.last_ping as created_at
      from public.bible_reading_daily b join public.profiles p on p.id = b.user_id
     where b.last_ping is not null
    union all
    select p.id, p.full_name, p.role::text, 'bible_reading_done',
           '5 min de leitura completos · +1 XP' || case when p.role = 'cria' then ' · liberou a Sala de Jogos' else '' end,
           b.unlocked_at
      from public.bible_reading_daily b join public.profiles p on p.id = b.user_id
     where b.unlocked_at is not null
  ) x
  where x.created_at >= now() - interval '24 hours'
    and (p_exclude_user is null or x.actor_id <> p_exclude_user)
  order by x.created_at desc
  limit p_limit;
end;
$fn$;
revoke execute on function public.admin_recent_bible_activity(uuid, int) from anon, public;
grant execute on function public.admin_recent_bible_activity(uuid, int) to authenticated;
